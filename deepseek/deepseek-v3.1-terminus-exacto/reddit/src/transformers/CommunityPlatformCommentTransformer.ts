import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommentAtSummaryTransformer } from "./CommunityPlatformCommentAtSummaryTransformer";
import { CommunityPlatformPostAtSummaryTransformer } from "./CommunityPlatformPostAtSummaryTransformer";
import { CommunityPlatformUserAtSummaryTransformer } from "./CommunityPlatformUserAtSummaryTransformer";

export namespace CommunityPlatformCommentTransformer {
  export type Payload = Prisma.community_platform_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        is_deleted: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: CommunityPlatformUserAtSummaryTransformer.select(),
        post: CommunityPlatformPostAtSummaryTransformer.select(),
        parent: CommunityPlatformCommentAtSummaryTransformer.select(),
        commentScore: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_comment_scoresFindManyArgs,
        replies: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_commentsFindManyArgs,
        voteScore: {
          select: {
            score: true,
          },
        } satisfies Prisma.community_platform_comment_vote_scoresFindManyArgs,
        auditLogs: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_audit_log_of_adminsFindManyArgs,
        activities: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_user_activitiesFindManyArgs,
        systemNotificationComments: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_system_notification_of_adminsFindManyArgs,
        moderationQueues: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_moderation_queuesFindManyArgs,
        moderations: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_comment_moderationsFindManyArgs,
        snapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_comment_snapshotsFindManyArgs,
        editHistories: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_comment_editsFindManyArgs,
        childHierarchies: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_comment_hierarchiesFindManyArgs,
        parentHierarchies: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_comment_hierarchiesFindManyArgs,
        votes: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_comment_votesFindManyArgs,
        voteRateLimits: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_vote_rate_limit_of_commentsFindManyArgs,
        votingTransactions: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_voting_transaction_of_commentsFindManyArgs,
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
    } satisfies Prisma.community_platform_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformComment> {
    return {
      id: input.id,
      content: input.content,
      is_deleted: input.is_deleted,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      author: await CommunityPlatformUserAtSummaryTransformer.transform(
        input.author,
      ),
      post: await CommunityPlatformPostAtSummaryTransformer.transform(
        input.post,
      ),
      parent: input.parent
        ? await CommunityPlatformCommentAtSummaryTransformer.transform(
            input.parent,
          )
        : null,
      vote_score: input.voteScore?.score ?? 0,
      replies_count: input.replies.length,
    };
  }
}
