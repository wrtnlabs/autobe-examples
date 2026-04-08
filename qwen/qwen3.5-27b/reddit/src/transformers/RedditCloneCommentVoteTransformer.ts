import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentVote";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommentAtSummaryTransformer } from "./RedditCloneCommentAtSummaryTransformer";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";

export namespace RedditCloneCommentVoteTransformer {
  export type Payload = Prisma.reddit_clone_comment_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
        member: RedditCloneMemberAtSummaryTransformer.select(),
        comment: RedditCloneCommentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_comment_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneCommentVote> {
    return {
      id: input.id,
      vote_type: input.vote_type,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      member: await RedditCloneMemberAtSummaryTransformer.transform(
        input.member,
      ),
      comment: await RedditCloneCommentAtSummaryTransformer.transform(
        input.comment,
      ),
    };
  }
}
