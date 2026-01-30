import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPageIEconomicForumPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicForumPostAttachment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEconomicForumPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumPostAttachment";

export async function getEconomicForumPostsPostIdAttachments(props: {
  postId: string;
}): Promise<IPageIEconomicForumPostAttachment.ISummary> {
  const postId = props.postId;
  // Pagination parameters from request body are not part of props - use defaults as per spec
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const safeLimit = Math.min(limit, 1000);
  // Verify post exists
  const postExists = await MyGlobal.prisma.economic_forum_posts.count({
    where: { id: postId },
  });
  if (postExists === 0) {
    throw new HttpException("Post not found", 404);
  }
  // Query attachments with correct field references from schema
  const attachments =
    await MyGlobal.prisma.economic_forum_post_attachments.findMany({
      where: { economic_forum_post_id: postId },
      skip,
      take: safeLimit,
      orderBy: { sequence: "desc" },
      select: {
        economic_forum_attachment_file_id: true,
        id: true,
        economic_forum_post_id: true,
        sequence: true,
      },
    });
  // Get attachment files data using separate query with correct schema field names
  const attachmentFileIds = attachments.map(
    (a) => a.economic_forum_attachment_file_id,
  );
  const attachmentFiles =
    await MyGlobal.prisma.economic_forum_attachment_files.findMany({
      where: { id: { in: attachmentFileIds } },
      select: {
        id: true,
        original_filename: true, // From schema: original_filename maps to file_name
        size: true, // From schema: size maps to file_size
        created_at: true, // Directly matches created_at
      },
    });
  // Create a map for quick lookup with correct field mapping
  const fileMap = new Map<string, IEconomicForumPostAttachment.ISummary>();
  attachmentFiles.forEach((file) => {
    fileMap.set(file.id, {
      id: file.id,
      file_name: file.original_filename, // Mapped from original_filename
      file_size: file.size, // Mapped from size
      created_at: toISOStringSafe(file.created_at),
      file_url: "https://storage.example.com/attachments/" + file.id, // Constructed URL from ID
    });
  });
  // Transform attachments to summary format using the mapping
  const transformedAttachments = attachments.map((a) => {
    const file = fileMap.get(a.economic_forum_attachment_file_id);
    return file!; // Safe to dereference - already filtered for existence
  });
  // Count total attachments
  const total = await MyGlobal.prisma.economic_forum_post_attachments.count({
    where: { economic_forum_post_id: postId },
  });
  return {
    data: transformedAttachments,
    pagination: {
      current: page,
      limit: safeLimit,
      records: total,
      pages: Math.ceil(total / safeLimit),
    },
  };
}
