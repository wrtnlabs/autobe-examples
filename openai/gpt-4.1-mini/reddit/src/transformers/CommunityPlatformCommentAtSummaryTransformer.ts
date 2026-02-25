import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommentAtSummaryTransformer } from "./CommunityPlatformCommentAtSummaryTransformer";
import { CommunityPlatformUserAtSummaryTransformer } from "./CommunityPlatformUserAtSummaryTransformer";

export namespace CommunityPlatformCommentAtSummaryTransformer {
  export type Payload = Prisma.community_platform_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select(): Prisma.community_platform_commentsFindManyArgs {
    return {
      select: {
        id: true,
        content: true,
        is_deleted: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: CommunityPlatformUserAtSummaryTransformer.select(),
        post: {
          select: {
            id: true,
          },
        },
        parent: {
          select: {
            id: true,
          },
        },
        reportedContentReports: {
          select: {
            id: true,
          },
        },
        userVotes: {
          select: {
            id: true,
          },
        },
        commentReports: {
          select: {
            id: true,
          },
        },
        moderationLogs: {
          select: {
            id: true,
          },
        },
        children: CommunityPlatformCommentAtSummaryTransformer.select(),
        commentVotes: {
          select: {
            id: true,
          },
        },
        commentSortOrders: {
          select: {
            id: true,
          },
        },
        deletionRecords: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.community_platform_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformComment.ISummary> {
    return {
      id: input.id,
      content: input.content,
      isDeleted: input.is_deleted,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      author: await CommunityPlatformUserAtSummaryTransformer.transform(
        input.user,
      ),
      parentId: input.parent?.id ?? null,
      children: await ArrayUtil.asyncMap(input.children, (child: Payload) =>
        transform(child),
      ),
    };
  }
}
