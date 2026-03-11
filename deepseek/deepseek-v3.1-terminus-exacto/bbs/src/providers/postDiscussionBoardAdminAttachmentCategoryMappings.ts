import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IDiscussionBoardAttachmentCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategory";
import { IDiscussionBoardAttachmentCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategoryMapping";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardAttachmentCategoryMappingCollector } from "../collectors/DiscussionBoardAttachmentCategoryMappingCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAttachmentCategoryMappingTransformer } from "../transformers/DiscussionBoardAttachmentCategoryMappingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminAttachmentCategoryMappings(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAttachmentCategoryMapping.ICreate;
}): Promise<IDiscussionBoardAttachmentCategoryMapping> {
  // 1. Validate attachment exists and is not deleted
  const attachment =
    await MyGlobal.prisma.discussion_board_attachments.findFirst({
      where: {
        id: props.body.discussion_board_attachment_id,
        deleted_at: null,
      },
    });
  if (!attachment) {
    throw new HttpException("Attachment not found or has been deleted", 404);
  }
  // 2. Validate category exists and is active
  const category =
    await MyGlobal.prisma.discussion_board_attachment_categories.findFirst({
      where: {
        id: props.body.discussion_board_attachment_category_id,
        is_active: true,
        deleted_at: null,
      },
    });
  if (!category) {
    throw new HttpException("Category not found or is inactive", 404);
  }
  // 3. Check for existing mapping
  const existingMapping =
    await MyGlobal.prisma.discussion_board_attachment_category_mappings.findFirst(
      {
        where: {
          discussion_board_attachment_id:
            props.body.discussion_board_attachment_id,
          discussion_board_attachment_category_id:
            props.body.discussion_board_attachment_category_id,
        },
      },
    );
  if (existingMapping) {
    throw new HttpException(
      "Mapping already exists between this attachment and category",
      409,
    );
  }
  // 4. Create the mapping using Collector
  const mapping =
    await MyGlobal.prisma.discussion_board_attachment_category_mappings.create({
      data: await DiscussionBoardAttachmentCategoryMappingCollector.collect({
        body: props.body,
      }),
      ...DiscussionBoardAttachmentCategoryMappingTransformer.select(),
    });
  // 5. Return transformed result
  return await DiscussionBoardAttachmentCategoryMappingTransformer.transform(
    mapping,
  );
}
