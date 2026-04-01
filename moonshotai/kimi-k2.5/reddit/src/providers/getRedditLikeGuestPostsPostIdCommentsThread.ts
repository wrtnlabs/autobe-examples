import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditLikeCommentAtThreadTransformer } from "../transformers/RedditLikeCommentAtThreadTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeGuestPostsPostIdCommentsThread(props: {
  guest: GuestPayload;
  postId: string & tags.Format<"uuid">;
  sort?: "Best" | "New" | "Controversial";
}): Promise<IRedditLikeComment.IThread[]> {
  // Verify post exists
  await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true },
  });
  // Determine sort order
  const sort = props.sort ?? "Best";
  let orderBy: Prisma.reddit_like_commentsOrderByWithRelationInput;
  if (sort === "New") {
    orderBy = { created_at: "desc" };
  } else if (sort === "Controversial") {
    // For controversial, we'll fetch and sort in-memory
    // Controversial = high total votes with score close to zero
    orderBy = { vote_score: "desc" }; // Initial fetch, will re-sort
  } else {
    // Best = highest vote score
    orderBy = { vote_score: "desc" };
  }
  // Get top-level comments for this post (parent_id is null)
  let comments = await MyGlobal.prisma.reddit_like_comments.findMany({
    where: {
      post_id: props.postId,
      parent_id: null,
    },
    orderBy,
    ...RedditLikeCommentAtThreadTransformer.select(),
  });
  // For controversial sort, re-order based on controversy score
  if (sort === "Controversial") {
    // Controversial: high total engagement with balanced upvotes/downvotes
    // We approximate by: total_votes = |vote_score| + 2*min(upvotes, downvotes)
    // Since we only have net score, use: total_activity = vote_score + 2*abs(vote_score) for positive
    // Or simpler: high absolute activity with score close to 0
    // Sort by: (total_estimated) * (1 - |score|/(total_estimated + 1))
    // For simplicity: sort by vote_score closest to 0 but with high magnitude (more votes)
    comments.sort((a, b) => {
      const aAbs = Math.abs(a.vote_score);
      const bAbs = Math.abs(b.vote_score);
      // Prefer comments with vote_score closer to 0 but still having votes
      // This is an approximation; true controversial needs upvote/downvote counts
      if (aAbs === 0 && bAbs === 0) return 0;
      if (aAbs === 0) return 1;
      if (bAbs === 0) return -1;
      // Lower absolute score = more controversial (balanced votes)
      return aAbs - bAbs;
    });
  }
  // Transform each comment (transformer handles nested replies recursively)
  return await ArrayUtil.asyncMap(
    comments,
    RedditLikeCommentAtThreadTransformer.transform,
  );
}
