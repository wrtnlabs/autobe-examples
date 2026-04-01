import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";

export namespace RedditCommunityCommentAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        parent: {
          select: {
            id: true,
          },
        },
        author: {
          select: {
            id: true,
            username: true,
            created_at: true,
            karma: { select: { current_score: true } },
            userAvatarFiles: {
              select: {
                id: true,
                created_at: true,
              },
            },
          },
        },
        replies: true,
        votes: true,
      },
    } satisfies Prisma.reddit_community_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IRedditCommunityComment.ISummary>,
      [string]
    > = createCache(),
  ): Promise<IRedditCommunityComment.ISummary> {
    const voteUpCount = input.votes.filter((v) => v.vote_type === "up").length;
    const voteDownCount = input.votes.filter(
      (v) => v.vote_type === "down",
    ).length;
    return {
      id: input.id,
      voteScore: voteUpCount - voteDownCount,
      createdAt: toISOStringSafe(input.created_at),
      parentComment: input.parent?.id ? await cache.get(input.parent.id) : null,
      replyCount: input.replies.length,
      author: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.author,
      ),
    };
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IRedditCommunityComment.ISummary[]> {
    const cache = createCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createCache() {
    const cache = new VariadicSingleton(
      async (id: string): Promise<IRedditCommunityComment.ISummary> => {
        const record =
          await MyGlobal.prisma.reddit_community_comments.findFirstOrThrow({
            ...select(),
            where: { id },
          });
        return transform(record, cache);
      },
    );
    return cache;
  }
}
