import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityCommentAtVoteRequestTransformer {
  export type Payload = Prisma.reddit_community_comment_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
        user: true,
        comment: true,
      },
    } satisfies Prisma.reddit_community_comment_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityComment.IVoteRequest> {
    const voteTypeMap: Record<string, "upvote" | "downvote" | "none"> = {
      upvote: "upvote",
      downvote: "downvote",
      none: "none",
    };
    const voteType = voteTypeMap[input.vote_type] ?? "none";
    return {
      voteType,
    };
  }
}
