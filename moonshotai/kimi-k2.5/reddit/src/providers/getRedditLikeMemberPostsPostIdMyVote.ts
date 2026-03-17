import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditLikeVoteTransformer } from "../transformers/RedditLikeVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeMemberPostsPostIdMyVote(props: {
  member: AdminPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeVote> {
  // First find the post-vote junction record to get the vote ID
  const postVote =
    await MyGlobal.prisma.reddit_like_post_votes.findFirstOrThrow({
      where: {
        reddit_like_post_id: props.postId,
      },
      select: {
        reddit_like_vote_id: true,
      },
    });
  // Then get the actual vote record with member info
  const vote = await MyGlobal.prisma.reddit_like_votes.findFirstOrThrow({
    where: {
      id: postVote.reddit_like_vote_id,
      member_id: props.member.id,
    },
    ...RedditLikeVoteTransformer.select(),
  });
  return await RedditLikeVoteTransformer.transform(vote);
}
