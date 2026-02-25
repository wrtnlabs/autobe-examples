import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformPostAtSummaryTransformer } from "./CommunityPlatformPostAtSummaryTransformer";
import { CommunityPlatformUserAtSummaryTransformer } from "./CommunityPlatformUserAtSummaryTransformer";

export namespace CommunityPlatformCommentAtSummaryTransformer {
  export type Payload = Prisma.community_platform_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        created_at: true,
        updated_at: true,
        is_deleted: true,
        deleted_at: true,
        author: CommunityPlatformUserAtSummaryTransformer.select(),
        post: CommunityPlatformPostAtSummaryTransformer.select(),
        parent: true,
        auditLogs: {
          select: { id: true },
        } satisfies Prisma.community_platform_audit_logsFindManyArgs,
        activities: {
          select: { id: true },
        } satisfies Prisma.community_platform_user_activitiesFindManyArgs,
        systemNotificationComments: {
          select: { id: true },
        } satisfies Prisma.community_platform_system_notificationsFindManyArgs,
        moderationQueues: {
          select: { id: true },
        } satisfies Prisma.community_platform_moderation_queuesFindManyArgs,
        replies: {
          select: { id: true },
        } satisfies Prisma.community_platform_commentsFindManyArgs,
        moderations: {
          select: { id: true },
        } satisfies Prisma.community_platform_moderatorsFindManyArgs,
        snapshots: {
          select: { id: true },
        } satisfies Prisma.community_platform_comment_snapshotsFindManyArgs,
        editHistories: {
          select: { id: true },
        } satisfies Prisma.community_platform_comment_editsFindManyArgs,
        childHierarchies: {
          select: { id: true },
        } satisfies Prisma.community_platform_comment_hierarchiesFindManyArgs,
        parentHierarchies: {
          select: { id: true },
        } satisfies Prisma.community_platform_comment_hierarchiesFindManyArgs,
        votes: {
          select: { id: true },
        } satisfies Prisma.community_platform_comment_votesFindManyArgs,
        commentScore: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_comment_scoresFindManyArgs,
      },
    } satisfies Prisma.community_platform_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformComment.ISummary> {
    return {
      id: input.id,
      content:
        input.content.length > 200
          ? input.content.substring(0, 200)
          : input.content,
      author: await CommunityPlatformUserAtSummaryTransformer.transform(
        input.author,
      ),
      post: await CommunityPlatformPostAtSummaryTransformer.transform(
        input.post,
      ),
      vote_score: 0,
      created_at: toISOStringSafe(input.created_at),
      updated_at: input.updated_at ? toISOStringSafe(input.updated_at) : null,
    };
  }
}
