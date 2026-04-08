import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommentAtSummaryTransformer } from "./RedditCloneCommentAtSummaryTransformer";
import { RedditClonePostAtSummaryTransformer } from "./RedditClonePostAtSummaryTransformer";
import { RedditCloneUserProfileAtSummaryTransformer } from "./RedditCloneUserProfileAtSummaryTransformer";

export namespace RedditCloneCommentAtInvertTransformer {
  export type Payload = Prisma.reddit_clone_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        userProfile: RedditCloneUserProfileAtSummaryTransformer.select(),
        post: RedditClonePostAtSummaryTransformer.select(),
        parentComment: RedditCloneCommentAtSummaryTransformer.select(),
        replies: undefined,
      },
    } satisfies Prisma.reddit_clone_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IRedditCloneComment.IInvert[]>,
      [string]
    > = createChildrenCache(),
  ): Promise<IRedditCloneComment.IInvert> {
    return {
      id: input.id,
      content: input.content,
      score: 0,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      author: await RedditCloneUserProfileAtSummaryTransformer.transform(
        input.userProfile,
      ),
      post: await RedditClonePostAtSummaryTransformer.transform(input.post),
      parentComment: input.parentComment
        ? await RedditCloneCommentAtSummaryTransformer.transform(
            input.parentComment,
          )
        : null,
      replies: await cache.get(input.id),
    };
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IRedditCloneComment.IInvert[]> {
    const cache = createChildrenCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createChildrenCache() {
    const cache = new VariadicSingleton(
      async (parentId: string): Promise<IRedditCloneComment.IInvert[]> => {
        const records = await MyGlobal.prisma.reddit_clone_comments.findMany({
          ...select(),
          where: { parent_comment_id: parentId },
        });
        return await ArrayUtil.asyncMap(records, (r) => transform(r, cache));
      },
    );
    return cache;
  }
}
