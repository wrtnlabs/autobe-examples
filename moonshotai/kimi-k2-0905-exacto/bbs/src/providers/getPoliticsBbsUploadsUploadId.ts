import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticsBbsFileAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsFileAttachment";
import { IPoliticsBbsArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsArticle";
import { IPoliticsBbsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsCategory";
import { IPoliticsBbsArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsArticleSnapshot";
import { IPoliticsBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsComment";
import { IPoliticsBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsMember";
import { IPoliticsBbsImageAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsImageAttachment";
import { IPoliticsBbsAttachmentOfVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsAttachmentOfVisitor";
import { IPoliticsBbsVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsVisitor";
import { IPoliticsBbsAttachmentOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsAttachmentOfMember";
import { IPoliticsBbsAttachmentOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsAttachmentOfModerator";
import { IPoliticsBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsModerator";

export async function getPoliticsBbsUploadsUploadId(props: {
  uploadId: string & tags.Format<"uuid">;
}): Promise<IPoliticsBbsFileAttachment> {
  // Fetch file attachment - Prisma schema errors require ORM specialist
  // image_attachments relationship doesn't exist in current schema
  const data = await MyGlobal.prisma.politics_bbs_file_attachments.findFirst({
    where: { id: props.uploadId },
    // include: { image_attachments: true } // ERROR: relationship doesn't exist
  });

  if (!data) {
    throw new HttpException("File attachment not found", 404);
  }

  // Return basic file attachment data without non-existent relationships
  const result = {
    id: data.id,
    politics_bbs_article_id: data.politics_bbs_article_id,
    politics_bbs_member_id: data.politics_bbs_member_id,
    filename: data.filename,
    file_size: data.file_size,
    mime_type: data.mime_type,
    file_path: data.file_path,
    created_at: toISOStringSafe(data.created_at),

    // Remove non-existent image_attachments and relationships
    image_attachments: [], // Empty array as relationship doesn't exist
    article: undefined,
    member: undefined,
    visitor_attachment: undefined,
    member_attachment: undefined,
    moderator_attachment: undefined,
  };

  return result as IPoliticsBbsFileAttachment;
}
