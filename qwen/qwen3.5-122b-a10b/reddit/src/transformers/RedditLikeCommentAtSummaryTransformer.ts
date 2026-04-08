import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";

export namespace RedditLikeCommentAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_commentsGetPayload<
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
        member: RedditLikeMemberAtSummaryTransformer.select(),
        parent: {
          select: {
            id: true,
          },
        },
        votes: true,
        replies: undefined,
        post: {
          select: {
            id: true,
          },
        },
        reports: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.reddit_like_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IRedditLikeComment.ISummary[]>,
      [string]
    > = createChildrenCache(),
  ): Promise<IRedditLikeComment.ISummary> {
    return {
      id: input.id,
      author: await RedditLikeMemberAtSummaryTransformer.transform(
        input.member,
      ),
      content: input.content,
      vote_score:
        input.votes.filter((v) => "type" in v && v.type === "UP").length -
        input.votes.filter((v) => "type" in v && v.type === "DOWN").length,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      replies: await cache.get(input.id),
    } satisfies IRedditLikeComment.ISummary;
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IRedditLikeComment.ISummary[]> {
    const cache = createChildrenCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createChildrenCache() {
    const cache = new VariadicSingleton(
      async (parentId: string): Promise<IRedditLikeComment.ISummary[]> => {
        const records = await MyGlobal.prisma.reddit_like_comments.findMany({
          ...select(),
          where: { parent: { id: parentId } },
        });
        return await ArrayUtil.asyncMap(records, (r) => transform(r, cache));
      },
    );
    return cache;
  }
}
