import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberSession";
import { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditLikeMemberAtSummaryTransformer } from "../transformers/RedditLikeMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeModeratorSessionsMe(props: {
  moderator: ModeratorPayload;
}): Promise<IRedditLikeMemberSession> {
  const session =
    await MyGlobal.prisma.reddit_like_moderator_sessions.findUniqueOrThrow({
      where: { id: props.moderator.session_id },
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        moderator: {
          select: {
            id: true,
            can_add_moderators: true,
            created_at: true,
            member: RedditLikeMemberAtSummaryTransformer.select(),
            community: {
              select: {
                id: true,
                name: true,
                description: true,
                created_at: true,
                owner: RedditLikeMemberAtSummaryTransformer.select(),
                iconAttachment: {
                  select: {
                    id: true,
                    original_filename: true,
                    mime_type: true,
                    file_size_bytes: true,
                    uploadedByMember:
                      RedditLikeMemberAtSummaryTransformer.select(),
                    created_at: true,
                  },
                },
                _count: {
                  select: {
                    subscriptions: {
                      where: { deleted_at: null },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  const communityData = session.moderator.community;
  const iconAttachment = communityData.iconAttachment;
  return {
    id: session.id,
    actorType: "moderator",
    actor: {
      id: session.moderator.id,
      canAddModerators: session.moderator.can_add_moderators,
      member: await RedditLikeMemberAtSummaryTransformer.transform(
        session.moderator.member,
      ),
      community: {
        id: communityData.id,
        name: communityData.name,
        description: communityData.description,
        owner: await RedditLikeMemberAtSummaryTransformer.transform(
          communityData.owner,
        ),
        icon: iconAttachment
          ? ({
              id: iconAttachment.id,
              originalFilename: iconAttachment.original_filename,
              mimeType: iconAttachment.mime_type,
              fileSizeBytes: iconAttachment.file_size_bytes,
              uploadedByMember:
                await RedditLikeMemberAtSummaryTransformer.transform(
                  iconAttachment.uploadedByMember,
                ),
              createdAt: toISOStringSafe(iconAttachment.created_at),
            } satisfies IRedditLikeAttachment.ISummary)
          : null,
        subscriberCount: communityData._count.subscriptions as number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
        createdAt: toISOStringSafe(communityData.created_at),
      } satisfies IRedditLikeCommunity.ISummary,
      createdAt: toISOStringSafe(session.moderator.created_at),
    } satisfies IRedditLikeModerator.ISummary,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    userAgent: null,
    createdAt: toISOStringSafe(session.created_at),
    expiredAt: session.expired_at ? toISOStringSafe(session.expired_at) : null,
    expiresAt: session.expired_at ? toISOStringSafe(session.expired_at) : null,
  };
}
