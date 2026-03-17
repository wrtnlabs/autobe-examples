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

export async function deleteRedditCloneMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  if (post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  const isAuthor = post.member_id === props.member.id;
  let isModerator = false;
  if (!isAuthor) {
    const moderator = await MyGlobal.prisma.reddit_clone_moderators.findFirst({
      where: {
        community_id: post.community_id,
        member_id: props.member.id,
        deleted_at: null,
      },
    });
    isModerator = moderator !== null;
  }
  if (!isAuthor && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  const votes = await MyGlobal.prisma.reddit_clone_votes.findMany({
    where: {
      target_type: "POST",
      target_id: props.postId,
      deleted_at: null,
    },
  });
  let voteScore = 0;
  for (const vote of votes) {
    if (vote.vote_type === "UPVOTE") {
      voteScore += 1;
    } else if (vote.vote_type === "DOWNVOTE") {
      voteScore -= 1;
    }
  }
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.reddit_clone_posts.update({
    where: { id: props.postId },
    data: {
      deleted_at: now,
    },
  });
  await MyGlobal.prisma.reddit_clone_votes.updateMany({
    where: {
      target_type: "POST",
      target_id: props.postId,
      deleted_at: null,
    },
    data: {
      deleted_at: now,
    },
  });
  await MyGlobal.prisma.reddit_clone_karma_scores.update({
    where: { member_id: post.member_id },
    data: {
      score: { decrement: voteScore },
      updated_at: now,
    },
  });
}
