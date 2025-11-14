import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticalForumPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumPostAttachment";
import { IPageIPoliticalForumPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticalForumPostAttachment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function patchPoliticalForumCitizenPostsPostIdAttachmentFiles(props: {
  citizen: CitizenPayload;
  postId: string;
  body: IPoliticalForumPostAttachment.IRequest;
}): Promise<IPageIPoliticalForumPostAttachment.ISummary> {
  // Verify post exists and is accessible
  const post = await MyGlobal.prisma.political_forum_posts.findUnique({
    where: { id: props.postId, deleted_at: null },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  // Query all active attachments for the post, ordered by upload time
  const attachments =
    await MyGlobal.prisma.political_forum_post_attachments.findMany({
      where: {
        political_forum_post_id: props.postId,
        deleted_at: null,
      },
      orderBy: { uploaded_at: "asc" },
    });

  // Transform to ISummary format: since ISummary is defined as string, return file_path as string
  const summaryItems = attachments.map((attachment) => attachment.file_path);

  // Return paginated response following IPage pattern
  // Even though we return all attachments, follow standard pagination structure
  const pageSize = 100; // Maximum allowed by IPage.IPagination
  const total = summaryItems.length;
  const totalPages = Math.ceil(total / pageSize);

  return {
    pagination: {
      page: 1,
      pageSize,
      total,
      totalPages,
    },
    data: summaryItems,
  };
}
