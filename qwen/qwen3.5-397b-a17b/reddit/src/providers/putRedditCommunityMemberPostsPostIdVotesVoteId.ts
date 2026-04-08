import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityPostVoteTransformer } from "../transformers/RedditCommunityPostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCommunityMemberPostsPostIdVotesVoteId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostVote.IUpdate;
}): Promise<IRedditCommunityPostVote> {
  const vote =
    await MyGlobal.prisma.reddit_community_post_votes.findUniqueOrThrow({
      where: { id: props.voteId },
      select: {
        id: true,
        reddit_community_member_id: true,
        reddit_community_post_id: true,
      },
    });
  if (vote.reddit_community_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (vote.reddit_community_post_id !== props.postId) {
    throw new HttpException("Bad Request", 400);
  }
  await MyGlobal.prisma.reddit_community_post_votes.update({
    where: { id: props.voteId },
    data: {
      value: props.body.value,
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.reddit_community_post_votes.findUniqueOrThrow({
      where: { id: props.voteId },
      ...RedditCommunityPostVoteTransformer.select(),
    });
  return await RedditCommunityPostVoteTransformer.transform(updated);
}
