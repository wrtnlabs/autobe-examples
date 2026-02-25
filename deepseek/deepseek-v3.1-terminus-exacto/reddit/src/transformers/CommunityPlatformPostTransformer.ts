import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformUserAtSummaryTransformer } from "./CommunityPlatformUserAtSummaryTransformer";

export namespace CommunityPlatformPostTransformer {
  export type Payload = Prisma.community_platform_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        post_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: CommunityPlatformUserAtSummaryTransformer.select(),
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        votes: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_post_votesFindManyArgs,
        comments: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_commentsFindManyArgs,
        auditLogs: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_audit_logsFindManyArgs,
        activities: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_user_activitiesFindManyArgs,
        systemNotificationPosts: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_system_notificationsFindManyArgs,
        moderationQueues: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_moderation_queuesFindManyArgs,
        textContent: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_post_text_contentsFindManyArgs,
        linkContent: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_post_link_contentsFindManyArgs,
        imageContent: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_post_image_contentsFindManyArgs,
        snapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_post_snapshotsFindManyArgs,
        postImage: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_post_imagesFindManyArgs,
        postViews: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_post_viewsFindManyArgs,
        favoritedByUsers: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_post_favoritesFindManyArgs,
        voteScore: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_post_vote_scoresFindManyArgs,
        voteRateLimits: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_vote_rate_limitsFindManyArgs,
        votingTransactions: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_voting_transactionsFindManyArgs,
        moderationAuditLogs: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_moderation_audit_logsFindManyArgs,
        moderationActionLogs: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_moderation_action_logsFindManyArgs,
      },
    } satisfies Prisma.community_platform_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPost> {
    return {
      id: input.id,
      title: input.title,
      post_type: input.post_type,
      author: await CommunityPlatformUserAtSummaryTransformer.transform(
        input.user,
      ),
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      votes_count: input.votes.length,
      comments_count: input.comments.length,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
