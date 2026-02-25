import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommentAtSummaryTransformer } from "./CommunityPlatformCommentAtSummaryTransformer";
import { CommunityPlatformCommentTransformer } from "./CommunityPlatformCommentTransformer";
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
        user: CommunityPlatformUserAtSummaryTransformer.select(),
        post: {
          select: {
            id: true,
          } satisfies Prisma.community_platform_postsSelect,
        },
        parent: CommunityPlatformCommentAtSummaryTransformer.select(),
        children: {
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
              } satisfies Prisma.community_platform_postsSelect,
            },
            parent: CommunityPlatformCommentAtSummaryTransformer.select(),
            children: true,
          } satisfies Prisma.community_platform_commentsFindManyArgs,
        },
        reportedContentReports: { select: {} },
        userVotes: { select: {} },
        commentReports: { select: {} },
        moderationLogs: { select: {} },
        commentVotes: { select: {} },
        commentSortOrders: { select: {} },
        deletionRecords: { select: {} },
      },
    } satisfies Prisma.community_platform_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformComment> {
    async function transformChild(
      child: Payload,
    ): Promise<ICommunityPlatformComment> {
      return CommunityPlatformCommentTransformer.transform(child);
    }
    return {
      id: input.id,
      content: input.content,
      isDeleted: input.is_deleted,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at ? input.deleted_at.toISOString() : null,
      user: await CommunityPlatformUserAtSummaryTransformer.transform(
        input.user,
      ),
      postId: input.post.id,
      parent: input.parent
        ? await CommunityPlatformCommentAtSummaryTransformer.transform(
            input.parent,
          )
        : null,
      children: await Promise.all(input.children.map(transformChild)),
    };
  }
}
