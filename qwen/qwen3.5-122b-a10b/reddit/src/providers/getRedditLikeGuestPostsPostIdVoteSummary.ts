import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeGuestPostsPostIdVoteSummary(props: {
  guest: GuestPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditLikePost.IVoteSummary> {
  // Verify post exists and is not soft-deleted
  await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Count upvotes for this post (excluding soft-deleted votes)
  const upvote_count = await MyGlobal.prisma.reddit_like_votes.count({
    where: {
      reddit_like_post_id: props.postId,
      vote_type: "upvote",
      deleted_at: null,
    },
  });
  // Count downvotes for this post (excluding soft-deleted votes)
  const downvote_count = await MyGlobal.prisma.reddit_like_votes.count({
    where: {
      reddit_like_post_id: props.postId,
      vote_type: "downvote",
      deleted_at: null,
    },
  });
  // Calculate vote score as upvotes minus downvotes
  const vote_score = upvote_count - downvote_count;
  return {
    id: props.postId,
    vote_score,
    upvote_count,
    downvote_count,
  };
}
