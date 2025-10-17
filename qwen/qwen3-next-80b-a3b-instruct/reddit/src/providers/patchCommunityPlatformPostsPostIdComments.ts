import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchCommunityPlatformPostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.IRequest;
}): Promise<IPageICommunityPlatformComment.ISummary> {
  // Validate that the post exists
  const postExists = await MyGlobal.prisma.community_platform_posts.count({
    where: { id: props.postId },
  });

  if (postExists === 0) {
    throw new HttpException("Post not found", 404);
  }

  // Extract pagination parameters (assumed validated by controller)
  const {
    page = 1,
    limit = 20,
    minDepth,
    maxDepth,
    sort = "created_at",
    order = "desc",
  } = props.body;
  const skip = (page - 1) * limit;
  const take = limit;

  // Build where conditions
  const whereConditions = {
    community_platform_post_id: props.postId,
    status: "published",
    // Removed deleted_at: null because it doesn't exist in community_platform_comments schema
    ...(minDepth !== undefined && { depth_level: { gte: minDepth } }),
    ...(maxDepth !== undefined && { depth_level: { lte: maxDepth } }),
  };

  // Build order by clause
  const orderBy = {
    [sort]: order,
  };

  // Find total count of matching comments
  const totalCount = await MyGlobal.prisma.community_platform_comments.count({
    where: whereConditions,
  });

  // Find the comments with pagination and ordering
  const comments = await MyGlobal.prisma.community_platform_comments.findMany({
    where: whereConditions,
    orderBy: orderBy,
    skip: skip,
    take: take,
    include: {
      author: true, // This joins with community_platform_member to get username
    },
  });

  // Transform comments to summary format
  const summaries: ICommunityPlatformComment.ISummary[] = comments.map(
    (comment) => {
      // Truncate content to 500 characters
      const truncatedContent =
        comment.content.length > 500
          ? ((comment.content.substring(0, 500) + "...") as string &
              tags.MaxLength<500>)
          : (comment.content as string & tags.MaxLength<500>);

      // Extract preview links and images from comment content
      const urlRegex =
        /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
      const linkMatches = [...comment.content.matchAll(urlRegex)];
      const previewLinks =
        linkMatches.length > 0
          ? (linkMatches.map((match) => match[0]) as (string &
              tags.Format<"uri">)[])
          : undefined;

      const imageRegex =
        /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)\.(jpg|jpeg|png|gif|webp)/gi;
      const imageMatches = [...comment.content.matchAll(imageRegex)];
      const previewImages =
        imageMatches.length > 0
          ? (imageMatches.map((match) => match[0]) as (string &
              tags.Format<"uri">)[])
          : undefined;

      // Calculate is_reply
      const isReply = comment.parent_comment_id !== null;

      // Ensure status is correctly typed as the literal union type
      const status: ICommunityPlatformComment.ISummary["status"] =
        comment.status === "published" ||
        comment.status === "unreviewed" ||
        comment.status === "removed" ||
        comment.status === "archived"
          ? (comment.status as ICommunityPlatformComment.ISummary["status"])
          : "published"; // Default fallback

      return {
        id: comment.id,
        content: truncatedContent,
        vote_count: comment.vote_count,
        created_at: toISOStringSafe(comment.created_at),
        author_id: comment.author_id,
        author_username: comment.author.username,
        depth_level: comment.depth_level,
        status,
        is_reply: isReply,
        topic_id: comment.community_platform_post_id,
        karma_point: comment.vote_count,
        preview_links: previewLinks ?? undefined,
        preview_images: previewImages ?? undefined,
      } satisfies ICommunityPlatformComment.ISummary;
    },
  );

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / limit);

  // Return the paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalCount,
      pages: totalPages,
    } satisfies IPage.IPagination,
    data: summaries,
  } satisfies IPageICommunityPlatformComment.ISummary;
}
