import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityCommentAtSummaryTransformer } from "./RedditCommunityCommentAtSummaryTransformer";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";
import { RedditCommunityPostAtSummaryTransformer } from "./RedditCommunityPostAtSummaryTransformer";

export namespace RedditCommunityCommentTransformer {
  export type Payload = Prisma.reddit_community_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        body: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: RedditCommunityMemberAtSummaryTransformer.select(),
        post: RedditCommunityPostAtSummaryTransformer.select(),
        parent: true,
        replies: true,
        voteOfComments: true,
      },
    } satisfies Prisma.reddit_community_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityComment> {
    const voteOfComments = input.voteOfComments || [];
    const vote_score = voteOfComments.length;
    return {
      id: input.id,
      body: input.body,
      vote_score,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      author: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.author,
      ),
      post: await RedditCommunityPostAtSummaryTransformer.transform(input.post),
      parent: input.parent
        ? await RedditCommunityCommentAtSummaryTransformer.transform(
            input.parent,
          )
        : undefined,
      replies: await ArrayUtil.asyncMap(
        input.replies,
        RedditCommunityCommentAtSummaryTransformer.transform,
      ),
    } satisfies IRedditCommunityComment;
  }
}
