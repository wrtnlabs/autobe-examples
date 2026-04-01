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

export async function putRedditLikeAuthModeratorRefresh(props: {
  body: IRedditLikeModerator.IRefresh;
}): Promise<IRedditLikeModerator.IAuthorized> {
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
  if (decoded.type !== "moderator") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate member exists and is active
  const member = await MyGlobal.prisma.reddit_like_members.findUniqueOrThrow({
    where: { id: decoded.id },
    select: {
      id: true,
      email: true,
      username: true,
      email_verified: true,
      created_at: true,
      deleted_at: true,
    },
  });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 4. Validate moderator role exists and is active with community
  const moderator =
    await MyGlobal.prisma.reddit_like_moderators.findFirstOrThrow({
      where: {
        member_id: decoded.id,
        deleted_at: null,
      },
      select: {
        id: true,
        member_id: true,
        community_id: true,
        can_add_moderators: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            owner_id: true,
            icon_attachment_id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
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
  // 5. Calculate subscriber count
  const subscriberCount =
    await MyGlobal.prisma.reddit_like_community_subscriptions.count({
      where: {
        community: { id: moderator.community_id },
        deleted_at: null,
      },
    });
  // 6. Generate new tokens with same session_id
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "moderator",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "moderator",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Construct response
  const community = moderator.community;
  const iconAttachment = community.iconAttachment;
  return {
    id: moderator.id,
    can_add_moderators: moderator.can_add_moderators,
    member: {
      id: member.id,
      email: member.email,
      username: member.username,
      emailVerified: member.email_verified,
      createdAt: toISOStringSafe(member.created_at),
    },
    community: {
      id: community.id,
      name: community.name,
      description: community.description,
      owner: {
        id: community.owner.id,
        email: community.owner.email,
        username: community.owner.username,
        emailVerified: community.owner.email_verified,
        createdAt: toISOStringSafe(community.owner.created_at),
      },
      icon: iconAttachment?.uploadedByMember
        ? {
            id: iconAttachment.id,
            originalFilename: iconAttachment.original_filename,
            mimeType: iconAttachment.mime_type,
            fileSizeBytes: iconAttachment.file_size_bytes,
            uploadedByMember: {
              id: iconAttachment.uploadedByMember.id,
              email: iconAttachment.uploadedByMember.email,
              username: iconAttachment.uploadedByMember.username,
              emailVerified: iconAttachment.uploadedByMember.email_verified,
              createdAt: toISOStringSafe(
                iconAttachment.uploadedByMember.created_at,
              ),
            },
            createdAt: toISOStringSafe(iconAttachment.created_at),
          }
        : null,
      subscriberCount,
      createdAt: toISOStringSafe(community.created_at),
    },
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    deleted_at: moderator.deleted_at
      ? toISOStringSafe(moderator.deleted_at)
      : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
