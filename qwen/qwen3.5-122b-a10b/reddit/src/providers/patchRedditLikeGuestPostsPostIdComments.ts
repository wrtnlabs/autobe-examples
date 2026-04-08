import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeComment";
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
import { RedditLikeCommentAtSummaryTransformer } from "../transformers/RedditLikeCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeGuestPostsPostIdComments(props: {
  guest: GuestPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditLikeComment.IRequest;
}): Promise<IPageIRedditLikeComment.ISummary> {
  // Verify post exists
  await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  // Parse pagination parameters with validation
  const limitRaw = props.body.limit ?? 20;
  const limit = Math.min(Math.max(1, limitRaw), 100);
  // Decode cursor if provided
  let cursorCreated: string | null = null;
  let cursorId: string | null = null;
  if (props.body.cursor) {
    try {
      const decoded = JSON.parse(
        Buffer.from(props.body.cursor, "base64").toString("utf-8"),
      );
      if (
        typeof decoded === "object" &&
        decoded !== null &&
        "created_at" in decoded &&
        typeof decoded.created_at === "string" &&
        "id" in decoded &&
        typeof decoded.id === "string"
      ) {
        cursorCreated = decoded.created_at;
        cursorId = decoded.id;
      }
    } catch {
      // Invalid cursor, ignore it
    }
  }
  // Build where clause - exclude soft-deleted comments
  const whereInput = {
    deleted_at: null,
    reddit_like_post_id: props.postId,
    ...(cursorCreated && cursorId
      ? {
          AND: [
            {
              OR: [
                { created_at: { gt: cursorCreated } },
                { created_at: { equals: cursorCreated } },
              ],
            },
            {
              OR: [
                { id: { gt: cursorId } },
                { created_at: { gt: cursorCreated } },
              ],
            },
          ],
        }
      : {}),
  } satisfies Prisma.reddit_like_commentsWhereInput;
  // Build orderBy based on sort option
  const orderByInput =
    props.body.sort === "new" || !props.body.sort
      ? { created_at: "desc" as const }
      : { created_at: "desc" as const };
  // Query comments with pagination
  const take = limit + 1; // +1 to check if there's a next page
  const records = await MyGlobal.prisma.reddit_like_comments.findMany({
    ...RedditLikeCommentAtSummaryTransformer.select(),
    where: whereInput,
    orderBy: orderByInput,
    take,
  });
  // Check if there's a next page
  const hasNextPage = records.length > limit;
  if (hasNextPage) {
    records.pop(); // Remove the extra record
  }
  // Transform records using transformer (handles nested replies recursively)
  const data =
    await RedditLikeCommentAtSummaryTransformer.transformAll(records);
  // Count total records for pagination metadata
  const total = await MyGlobal.prisma.reddit_like_comments.count({
    where: {
      deleted_at: null,
      reddit_like_post_id: props.postId,
    },
  });
  // Calculate pagination metadata
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: 1,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIRedditLikeComment.ISummary;
}
