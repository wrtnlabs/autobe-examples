import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneAuthMemberJoin(props: {
  ip: string;
  body: IRedditCloneMemberSession.IJoin;
}): Promise<IRedditCloneMemberSession.IAuthorized> {
  // 1. Check duplicate email
  const existingEmail = await MyGlobal.prisma.reddit_clone_members.findFirst({
    where: { email: props.body.email },
  });
  if (existingEmail) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Check duplicate username
  const existingUsername = await MyGlobal.prisma.reddit_clone_members.findFirst(
    {
      where: { username: props.body.username },
    },
  );
  if (existingUsername) {
    throw new HttpException("Username already taken", 409);
  }
  // 3. Prepare timestamps and IDs
  const memberId = v4() as string & tags.Format<"uuid">;
  const sessionId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  // 4. Create member with hashed password
  await MyGlobal.prisma.reddit_clone_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      username: props.body.username,
      created_at: now,
      updated_at: now,
    },
  });
  // 5. Create user profile with display_name
  await MyGlobal.prisma.reddit_clone_user_profiles.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reddit_clone_member_id: memberId,
      display_name: props.body.username,
      created_at: now,
      updated_at: now,
    },
  });
  // 6. Create karma record with zero score
  await MyGlobal.prisma.reddit_clone_user_karmas.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reddit_clone_member_id: memberId,
      karma_score: 0,
      created_at: now,
      updated_at: now,
    },
  });
  // 7. Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "member",
      id: memberId,
      session_id: sessionId,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: memberId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 8. Store session in database
  await MyGlobal.prisma.reddit_clone_member_sessions.create({
    data: {
      id: sessionId,
      reddit_clone_member_id: memberId,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpires,
    },
  });
  // 9. Fetch member for response
  const member = await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow({
    where: { id: memberId },
    select: {
      id: true,
      email: true,
      username: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      profile: {
        select: {
          id: true,
          display_name: true,
          bio: true,
          created_at: true,
          updated_at: true,
          avatarFileAssociation: {
            select: {
              id: true,
              created_at: true,
              updated_at: true,
              target_type: true,
              target_id: true,
              file: {
                select: {
                  id: true,
                  original_filename: true,
                  mime_type: true,
                  file_size: true,
                  status: true,
                  created_at: true,
                  uploader: {
                    select: {
                      id: true,
                      username: true,
                      created_at: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      karma: {
        select: {
          id: true,
          karma_score: true,
          created_at: true,
          updated_at: true,
        },
      },
    },
  });
  // 10. Build token
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // 11. Build member summary for owner reference
  const memberSummaryForOwner: IRedditCloneMemberSession.ISummary = {
    id: member.id,
    username: member.username,
    created_at: now,
    profile: {
      id: member.profile!.id,
      display_name: member.profile!.display_name,
      bio: member.profile!.bio ?? null,
    },
    karma_count: member.karma!.karma_score,
  };
  // 12. Build and return authorized response
  return {
    id: member.id,
    email: member.email,
    username: member.username,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    profile: {
      id: member.profile!.id,
      display_name: member.profile!.display_name,
      bio: member.profile!.bio ?? null,
      created_at: now,
      updated_at: now,
      owner: memberSummaryForOwner,
      avatar: member.profile!.avatarFileAssociation
        ? {
            id: member.profile!.avatarFileAssociation.id,
            created_at: toISOStringSafe(
              member.profile!.avatarFileAssociation.created_at,
            ),
            updated_at: toISOStringSafe(
              member.profile!.avatarFileAssociation.updated_at,
            ),
            target_type: member.profile!.avatarFileAssociation.target_type,
            target_id: member.profile!.avatarFileAssociation.target_id,
            file: {
              id: member.profile!.avatarFileAssociation.file.id,
              originalFilename:
                member.profile!.avatarFileAssociation.file.original_filename,
              mimeType: member.profile!.avatarFileAssociation.file.mime_type,
              fileSize: member.profile!.avatarFileAssociation.file.file_size,
              status: member.profile!.avatarFileAssociation.file.status,
              createdAt: toISOStringSafe(
                member.profile!.avatarFileAssociation.file.created_at,
              ),
              uploader: {
                id: member.profile!.avatarFileAssociation.file.uploader.id,
                username:
                  member.profile!.avatarFileAssociation.file.uploader.username,
                created_at: toISOStringSafe(
                  member.profile!.avatarFileAssociation.file.uploader
                    .created_at,
                ),
                profile: {
                  id: member.profile!.id,
                  display_name: member.profile!.display_name,
                  bio: member.profile!.bio ?? null,
                },
                karma_count: member.karma!.karma_score,
              },
            },
          }
        : null,
    },
    karma: {
      id: member.karma!.id,
      reason: "",
      created_at: toISOStringSafe(member.karma!.created_at),
      updated_at: toISOStringSafe(member.karma!.updated_at),
      deleted_at: null,
      expires_at: null,
      community: {
        id: member.id,
        name: "",
        description: "",
        subscriber_count: 0,
        created_at: now,
        owner: memberSummaryForOwner,
      },
      bannedUser: memberSummaryForOwner,
      issuer: memberSummaryForOwner,
    },
    token,
  };
}
