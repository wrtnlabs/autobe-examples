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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAttachmentCategoryMappingTransformer } from "../transformers/DiscussionBoardAttachmentCategoryMappingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postDiscussionBoardSuperAdminAttachmentCategoryMappings(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardAttachmentCategoryMapping.ICreate;
}): Promise<IDiscussionBoardAttachmentCategoryMapping> {
  // 1. Verify attachment exists, is not deleted, and check article access
  const attachment =
    await MyGlobal.prisma.discussion_board_attachments.findUnique({
      where: { id: props.body.discussion_board_attachment_id },
      select: {
        id: true,
        deleted_at: true,
        article: {
          select: { id: true },
        },
      },
    });
  if (!attachment) {
    throw new HttpException("Attachment not found", 404);
  }
  if (attachment.deleted_at !== null) {
    throw new HttpException("Attachment has been deleted", 400);
  }
  // As superAdmin, has permission to modify any article, so no additional check needed
  // 2. Verify category exists and is active
  const category =
    await MyGlobal.prisma.discussion_board_attachment_categories.findUnique({
      where: { id: props.body.discussion_board_attachment_category_id },
      select: { id: true, is_active: true },
    });
  if (!category) {
    throw new HttpException("Category not found", 404);
  }
  if (!category.is_active) {
    throw new HttpException("Category is not active", 400);
  }
  // 3. Check for existing mapping (unique constraint)
  const existingMapping =
    await MyGlobal.prisma.discussion_board_attachment_category_mappings.findUnique(
      {
        where: {
          discussion_board_attachment_id_discussion_board_attachment_category_id:
            {
              discussion_board_attachment_id:
                props.body.discussion_board_attachment_id,
              discussion_board_attachment_category_id:
                props.body.discussion_board_attachment_category_id,
            },
        },
      },
    );
  if (existingMapping) {
    throw new HttpException(
      "Mapping already exists between this attachment and category",
      409,
    );
  }
  // 4. Create the mapping using collector
  const collectorData =
    await DiscussionBoardAttachmentCategoryMappingCollector.collect({
      body: props.body,
    });
  await MyGlobal.prisma.discussion_board_attachment_category_mappings.create({
    data: collectorData,
  });
  // 5. Fetch with transformer select for complete response
  const mapping =
    await MyGlobal.prisma.discussion_board_attachment_category_mappings.findUniqueOrThrow(
      {
        where: {
          discussion_board_attachment_id_discussion_board_attachment_category_id:
            {
              discussion_board_attachment_id:
                props.body.discussion_board_attachment_id,
              discussion_board_attachment_category_id:
                props.body.discussion_board_attachment_category_id,
            },
        },
        ...DiscussionBoardAttachmentCategoryMappingTransformer.select(),
      },
    );
  // 6. Transform to response DTO
  return await DiscussionBoardAttachmentCategoryMappingTransformer.transform(
    mapping,
  );
}
