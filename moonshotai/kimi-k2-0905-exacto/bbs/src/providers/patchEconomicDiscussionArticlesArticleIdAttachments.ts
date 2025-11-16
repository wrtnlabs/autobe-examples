import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachment";
import { IPageIEconomicDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionAttachment";

export async function patchEconomicDiscussionArticlesArticleIdAttachments(props: {
  articleId: string & tags.Format<"uuid">;
  body: IEconomicDiscussionAttachment.IRequest;
}): Promise<IPageIEconomicDiscussionAttachment.ISummary> {
  // Set defaults for pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build where conditions
  const whereConditions: Prisma.economic_discussion_attachmentsWhereInput = {
    economic_discussion_article_id: props.articleId,
  };

  // Add file_type filter if provided
  if (props.body.file_type) {
    whereConditions.file_type = props.body.file_type;
  }

  // Execute parallel queries for data and total count
  const [attachments, total] = await Promise.all([
    MyGlobal.prisma.economic_discussion_attachments.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: {
        uploaded_at: "desc",
      },
    }),
    MyGlobal.prisma.economic_discussion_attachments.count({
      where: whereConditions,
    }),
  ]);

  // Return formatted response
  return {
    data: attachments.map((attachment) => ({
      id: attachment.id,
      filename: attachment.filename,
      file_type: attachment.file_type,
      is_scanned: attachment.is_scanned,
    })),
    pagination: {
      current: page - 1, // Convert to 0-based for response
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
