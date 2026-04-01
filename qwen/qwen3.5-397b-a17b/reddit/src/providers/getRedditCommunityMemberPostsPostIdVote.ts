import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityPostVoteAtSummaryTransformer } from "../transformers/RedditCommunityPostVoteAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityMemberPostsPostIdVote(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityPostVote.ISummary | null> {
  const vote = await MyGlobal.prisma.reddit_community_post_votes.findFirst({
    where: {
      reddit_community_post_id: props.postId,
      reddit_community_member_id: props.member.id,
      deleted_at: null,
    },
    ...RedditCommunityPostVoteAtSummaryTransformer.select(),
  });
  if (vote === null) {
    return null;
  }
  return await RedditCommunityPostVoteAtSummaryTransformer.transform(vote);
}
