import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeAuthModeratorLogin(props: {
  ip: string;
  body: IRedditLikeModerator.ILogin;
}): Promise<IRedditLikeModerator.IAuthorized> {
  // 1. Find member by email with password_hash for verification
  const member = await MyGlobal.prisma.reddit_like_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      username: true,
      email_verified: true,
      password_hash: true,
      created_at: true,
    },
  });
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password using BCrypt
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Find moderator record for this member
  const moderator = await MyGlobal.prisma.reddit_like_moderators.findFirst({
    where: {
      member_id: member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      can_add_moderators: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          created_at: true,
          owner: {
            select: {
              id: true,
              email: true,
              username: true,
              email_verified: true,
              created_at: true,
            },
          },
          iconAttachment: {
            select: {
              id: true,
              original_filename: true,
              mime_type: true,
              file_size_bytes: true,
              created_at: true,
              uploadedByMember: {
                select: {
                  id: true,
                  email: true,
                  username: true,
                  email_verified: true,
                  created_at: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!moderator) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 4. Create new session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.reddit_like_moderator_sessions.create({
    data: {
      id: v4(),
      moderator_id: moderator.id,
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: new Date(),
      expired_at: accessExpires,
    },
  });
  // 5. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "moderator",
        id: member.id,
        session_id: session.id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "moderator",
        id: member.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 6. Calculate subscriber count for community
  const subscriberCount =
    await MyGlobal.prisma.reddit_like_community_subscriptions.count({
      where: {
        reddit_like_community_id: moderator.community.id,
        deleted_at: null,
      },
    });
  // 7. Return IAuthorized response
  return {
    id: moderator.id,
    can_add_moderators: moderator.can_add_moderators,
    member: {
      id: member.id,
      email: member.email,
      username: member.username,
      emailVerified: member.email_verified,
      createdAt: member.created_at.toISOString(),
    } satisfies IRedditLikeMember.ISummary,
    community: {
      id: moderator.community.id,
      name: moderator.community.name,
      description: moderator.community.description,
      owner: {
        id: moderator.community.owner.id,
        email: moderator.community.owner.email,
        username: moderator.community.owner.username,
        emailVerified: moderator.community.owner.email_verified,
        createdAt: moderator.community.owner.created_at.toISOString(),
      } satisfies IRedditLikeMember.ISummary,
      icon: moderator.community.iconAttachment
        ? ({
            id: moderator.community.iconAttachment.id,
            originalFilename:
              moderator.community.iconAttachment.original_filename,
            mimeType: moderator.community.iconAttachment.mime_type,
            fileSizeBytes: moderator.community.iconAttachment.file_size_bytes,
            uploadedByMember: {
              id: moderator.community.iconAttachment.uploadedByMember.id,
              email: moderator.community.iconAttachment.uploadedByMember.email,
              username:
                moderator.community.iconAttachment.uploadedByMember.username,
              emailVerified:
                moderator.community.iconAttachment.uploadedByMember
                  .email_verified,
              createdAt:
                moderator.community.iconAttachment.uploadedByMember.created_at.toISOString(),
            } satisfies IRedditLikeMember.ISummary,
            createdAt:
              moderator.community.iconAttachment.created_at.toISOString(),
          } satisfies IRedditLikeAttachment.ISummary)
        : null,
      subscriberCount: subscriberCount satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      createdAt: moderator.community.created_at.toISOString(),
    } satisfies IRedditLikeCommunity.ISummary,
    created_at: moderator.created_at.toISOString(),
    updated_at: moderator.updated_at.toISOString(),
    deleted_at: moderator.deleted_at?.toISOString() ?? null,
    token,
  };
}
