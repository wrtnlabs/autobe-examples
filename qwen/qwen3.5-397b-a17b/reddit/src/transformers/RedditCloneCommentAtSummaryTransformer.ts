import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";
import { RedditClonePostAtSummaryTransformer } from "./RedditClonePostAtSummaryTransformer";

export namespace RedditCloneCommentAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        body: true,
        created_at: true,
        member: RedditCloneMemberAtSummaryTransformer.select(),
        post: RedditClonePostAtSummaryTransformer.select(),
        parent: RedditCloneCommentAtSummaryTransformer.select(),
        children: {
          select: {
            id: true,
            deleted_at: true,
          },
        } satisfies Prisma.reddit_clone_commentsFindManyArgs,
      },
    } satisfies Prisma.reddit_clone_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneComment.ISummary> {
    return {
      id: input.id,
      body: input.body,
      author: await RedditCloneMemberAtSummaryTransformer.transform(
        input.member,
      ),
      post: await RedditClonePostAtSummaryTransformer.transform(input.post),
      parent: input.parent
        ? await RedditCloneCommentAtSummaryTransformer.transform(input.parent)
        : null,
      vote_score: 0,
      reply_count: input.children.filter(
        (c: { id: string; deleted_at: Date | null }) => c.deleted_at === null,
      ).length,
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
