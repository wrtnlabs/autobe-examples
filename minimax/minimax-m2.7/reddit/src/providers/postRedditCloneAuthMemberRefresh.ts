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

export async function postRedditCloneAuthMemberRefresh(props: {
  body: IRedditCloneMemberSession.IRefresh;
}): Promise<IRedditCloneMemberSession.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
      type: string;
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type for member refresh", 403);
  }
  // 3. Find session by refresh token
  const session = await MyGlobal.prisma.reddit_clone_member_sessions.findFirst({
    where: {
      refresh_token: props.body.refreshToken,
      reddit_clone_member_id: decoded.id,
    },
  });
  if (!session) {
    throw new HttpException("Session not found or expired", 401);
  }
  // 4. Check session expiration
  if (session.expired_at < new Date()) {
    throw new HttpException("Session has expired", 401);
  }
  // 5. Verify member is not soft-deleted
  const member = await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (member.deleted_at !== null) {
    throw new HttpException("Member account has been deleted", 403);
  }
  // 6. Generate new tokens (token rotation)
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const newAccessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session with new tokens
  await MyGlobal.prisma.reddit_clone_member_sessions.update({
    where: { id: session.id },
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expired_at: refreshExpires,
      ip: props.body.ip ?? session.ip,
      href: props.body.href ?? session.href,
      referrer: props.body.referrer ?? session.referrer,
    },
  });
  // 8. Fetch complete member data with profile, karma, and avatar
  const memberData =
    await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow({
      where: { id: member.id },
      include: {
        profile: {
          include: {
            avatarFileAssociation: {
              include: {
                file: {
                  include: {
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
        karma: true,
      },
    });
  // Helper to build file uploader summary
  const buildUploaderSummary = (uploader: {
    id: string;
    username: string;
    created_at: Date;
  }) => ({
    id: uploader.id as string & tags.Format<"uuid">,
    username: uploader.username,
    created_at: toISOStringSafe(uploader.created_at),
    profile: {
      id: memberData.profile!.id as string & tags.Format<"uuid">,
      display_name: memberData.profile!.display_name,
      bio: memberData.profile!.bio,
      avatar: null,
    },
    karma_count: memberData.karma?.karma_score ?? 0,
  });
  // Build profile response
  const profileResponse = {
    id: memberData.profile!.id as string & tags.Format<"uuid">,
    display_name: memberData.profile!.display_name,
    bio: memberData.profile!.bio,
    created_at: toISOStringSafe(memberData.profile!.created_at),
    updated_at: toISOStringSafe(memberData.profile!.updated_at),
    owner: {
      id: memberData.id as string & tags.Format<"uuid">,
      username: memberData.username,
      created_at: toISOStringSafe(memberData.created_at),
      profile: {
        id: memberData.profile!.id as string & tags.Format<"uuid">,
        display_name: memberData.profile!.display_name,
        bio: memberData.profile!.bio,
        avatar: memberData.profile!.avatarFileAssociation
          ? {
              id: memberData.profile!.avatarFileAssociation.id as string &
                tags.Format<"uuid">,
              target_id: memberData.profile!.avatarFileAssociation
                .target_id as string & tags.Format<"uuid">,
              target_type:
                memberData.profile!.avatarFileAssociation.target_type,
              created_at: toISOStringSafe(
                memberData.profile!.avatarFileAssociation.created_at,
              ),
              updated_at: toISOStringSafe(
                memberData.profile!.avatarFileAssociation.updated_at,
              ),
              file: {
                id: memberData.profile!.avatarFileAssociation.file
                  .id as string & tags.Format<"uuid">,
                originalFilename:
                  memberData.profile!.avatarFileAssociation.file
                    .original_filename,
                mimeType:
                  memberData.profile!.avatarFileAssociation.file.mime_type,
                fileSize:
                  memberData.profile!.avatarFileAssociation.file.file_size,
                status: memberData.profile!.avatarFileAssociation.file.status,
                createdAt: toISOStringSafe(
                  memberData.profile!.avatarFileAssociation.file.created_at,
                ),
                uploader: buildUploaderSummary(
                  memberData.profile!.avatarFileAssociation.file.uploader,
                ),
              },
            }
          : null,
      },
      karma_count: memberData.karma?.karma_score ?? 0,
    },
    avatar: memberData.profile!.avatarFileAssociation
      ? {
          id: memberData.profile!.avatarFileAssociation.id as string &
            tags.Format<"uuid">,
          target_id: memberData.profile!.avatarFileAssociation
            .target_id as string & tags.Format<"uuid">,
          target_type: memberData.profile!.avatarFileAssociation.target_type,
          created_at: toISOStringSafe(
            memberData.profile!.avatarFileAssociation.created_at,
          ),
          updated_at: toISOStringSafe(
            memberData.profile!.avatarFileAssociation.updated_at,
          ),
          file: {
            id: memberData.profile!.avatarFileAssociation.file.id as string &
              tags.Format<"uuid">,
            originalFilename:
              memberData.profile!.avatarFileAssociation.file.original_filename,
            mimeType: memberData.profile!.avatarFileAssociation.file.mime_type,
            fileSize: memberData.profile!.avatarFileAssociation.file.file_size,
            status: memberData.profile!.avatarFileAssociation.file.status,
            createdAt: toISOStringSafe(
              memberData.profile!.avatarFileAssociation.file.created_at,
            ),
            uploader: buildUploaderSummary(
              memberData.profile!.avatarFileAssociation.file.uploader,
            ),
          },
        }
      : null,
  } satisfies IRedditCloneUserProfile;
  // Build karma response - note: karma is per-community, for refresh we return minimal
  const karmaResponse = {
    id: memberData.karma!.id as string & tags.Format<"uuid">,
    reason: "Member karma",
    created_at: toISOStringSafe(memberData.karma!.created_at),
    updated_at: toISOStringSafe(memberData.karma!.updated_at),
    deleted_at: null as (string & tags.Format<"date-time">) | null,
    expires_at: null as (string & tags.Format<"date-time">) | null,
    community: {
      id: "00000000-0000-0000-0000-000000000000" as string &
        tags.Format<"uuid">,
      name: "system",
      description: "System",
      subscriber_count: 0,
      created_at: toISOStringSafe(memberData.created_at),
      owner: {
        id: memberData.id as string & tags.Format<"uuid">,
        username: memberData.username,
        created_at: toISOStringSafe(memberData.created_at),
        profile: {
          id: memberData.profile!.id as string & tags.Format<"uuid">,
          display_name: memberData.profile!.display_name,
          bio: memberData.profile!.bio,
          avatar: null,
        },
        karma_count: memberData.karma?.karma_score ?? 0,
      },
    } satisfies IRedditCloneCommunityBan.ISummary,
    bannedUser: {
      id: memberData.id as string & tags.Format<"uuid">,
      username: memberData.username,
      created_at: toISOStringSafe(memberData.created_at),
      profile: {
        id: memberData.profile!.id as string & tags.Format<"uuid">,
        display_name: memberData.profile!.display_name,
        bio: memberData.profile!.bio,
        avatar: null,
      },
      karma_count: memberData.karma?.karma_score ?? 0,
    },
    issuer: {
      id: memberData.id as string & tags.Format<"uuid">,
      username: memberData.username,
      created_at: toISOStringSafe(memberData.created_at),
      profile: {
        id: memberData.profile!.id as string & tags.Format<"uuid">,
        display_name: memberData.profile!.display_name,
        bio: memberData.profile!.bio,
        avatar: null,
      },
      karma_count: memberData.karma?.karma_score ?? 0,
    },
  } satisfies IRedditCloneUserKarma;
  return {
    id: memberData.id as string & tags.Format<"uuid">,
    email: memberData.email as string & tags.Format<"email">,
    username: memberData.username,
    created_at: toISOStringSafe(memberData.created_at),
    updated_at: toISOStringSafe(memberData.updated_at),
    deleted_at: memberData.deleted_at
      ? toISOStringSafe(memberData.deleted_at)
      : null,
    profile: profileResponse,
    karma: karmaResponse,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
