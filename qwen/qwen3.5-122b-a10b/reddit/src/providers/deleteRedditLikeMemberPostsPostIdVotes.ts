import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditLikeMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now = new Date();
  const vote = await MyGlobal.prisma.reddit_like_votes.findFirstOrThrow({
    where: {
      reddit_like_member_id: props.member.id,
      reddit_like_post_id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      vote_type: true,
      post: {
        select: {
          reddit_like_member_id: true,
        },
      },
    },
  });
  const voteType = vote.vote_type;
  const authorId = vote.post!.reddit_like_member_id;
  const scoreAdjustment = voteType === "upvote" ? -1 : 1;
  await MyGlobal.prisma.reddit_like_votes.update({
    where: { id: vote.id },
    data: { deleted_at: now },
  });
  await MyGlobal.prisma.reddit_like_user_profiles.update({
    where: { reddit_like_member_id: authorId },
    data: { karma_score: { increment: scoreAdjustment } },
  });
}
