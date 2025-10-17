import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteRedditCommunityMemberPostsPostIdPostVotesVoteId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, postId, voteId } = props;

  const vote = await MyGlobal.prisma.reddit_community_post_votes.findFirst({
    where: {
      id: voteId,
      post_id: postId,
    },
    select: {
      member_id: true,
    },
  });

  if (!vote) {
    throw new HttpException("Vote not found", 404);
  }

  if (vote.member_id !== member.id) {
    throw new HttpException(
      "Forbidden: You can only delete your own votes",
      403,
    );
  }

  await MyGlobal.prisma.reddit_community_post_votes.delete({
    where: {
      id: voteId,
    },
  });
}
