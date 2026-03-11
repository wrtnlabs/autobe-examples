import { IDiscussionBoardAttachmentCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategoryMapping";
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
import { DiscussionBoardAttachmentCategoryMappingAtResponseTransformer } from "../transformers/DiscussionBoardAttachmentCategoryMappingAtResponseTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminBulkCategorize(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAttachmentCategoryMapping.IRequest;
}): Promise<IDiscussionBoardAttachmentCategoryMapping.IResponse> {
  // Check bulk operation capacity limits from analysis section 200/221
  // For now, set a reasonable limit of 100 operations per bulk request
  const MAX_BULK_OPERATIONS = 100;
  // Step 1: Parse filter criteria from request body
  const {
    attachment_id,
    category_id,
    created_at_start,
    created_at_end,
    page,
    limit,
  } = props.body;
  // Step 2: Validate that at least one filter is provided
  if (!attachment_id && !category_id && !created_at_start && !created_at_end) {
    throw new HttpException(
      "At least one filter criterion must be provided",
      400,
    );
  }
  // Step 3: Find attachments matching filter criteria
  const attachmentWhere: Prisma.discussion_board_attachmentsWhereInput = {
    deleted_at: null,
    ...(attachment_id && { id: attachment_id }),
  };
  const attachments =
    await MyGlobal.prisma.discussion_board_attachments.findMany({
      where: attachmentWhere,
      select: { id: true },
    });
  if (attachments.length === 0) {
    throw new HttpException(
      "No attachments found matching filter criteria",
      404,
    );
  }
  // Step 4: Find categories matching filter criteria
  const categoryWhere: Prisma.discussion_board_attachment_categoriesWhereInput =
    {
      deleted_at: null,
      is_active: true,
      ...(category_id && { id: category_id }),
    };
  const categories =
    await MyGlobal.prisma.discussion_board_attachment_categories.findMany({
      where: categoryWhere,
      select: { id: true },
    });
  if (categories.length === 0) {
    throw new HttpException(
      "No active categories found matching filter criteria",
      404,
    );
  }
  // Step 5: Check bulk operation size - cross product of attachments × categories
  const potentialOperations = attachments.length * categories.length;
  if (potentialOperations > MAX_BULK_OPERATIONS) {
    throw new HttpException(
      `Bulk operation would create ${potentialOperations} mappings, exceeding limit of ${MAX_BULK_OPERATIONS}. Please use more specific filters.`,
      400,
    );
  }
  // Step 6: Process bulk categorization in transaction
  const results = await MyGlobal.prisma.$transaction(async (tx) => {
    const createdMappings = [];
    const errors = [];
    for (const attachment of attachments) {
      for (const category of categories) {
        try {
          // Check if mapping already exists
          const existing =
            await tx.discussion_board_attachment_category_mappings.findFirst({
              where: {
                discussion_board_attachment_id: attachment.id,
                discussion_board_attachment_category_id: category.id,
              },
            });
          if (existing) {
            errors.push({
              attachment_id: attachment.id,
              category_id: category.id,
              error: "Mapping already exists",
            });
            continue;
          }
          // Create new mapping
          const collectorData =
            await DiscussionBoardAttachmentCategoryMappingCollector.collect({
              body: {
                discussion_board_attachment_id: attachment.id as string &
                  tags.Format<"uuid">,
                discussion_board_attachment_category_id: category.id as string &
                  tags.Format<"uuid">,
              },
            });
          const created =
            await tx.discussion_board_attachment_category_mappings.create({
              data: collectorData,
              ...DiscussionBoardAttachmentCategoryMappingAtResponseTransformer.select(),
            });
          createdMappings.push(created);
        } catch (error) {
          errors.push({
            attachment_id: attachment.id,
            category_id: category.id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }
    return { createdMappings, errors };
  });
  // Step 7: Build response
  const responseMappingData = results.createdMappings;
  // Transform created mappings for response
  const transformedResponse =
    await DiscussionBoardAttachmentCategoryMappingAtResponseTransformer.transform(
      responseMappingData,
    );
  // Add error information to response items
  if (results.errors.length > 0) {
    const errorItems = results.errors.map((error) => {
      return {
        id: v4() as string & tags.Format<"uuid">,
        attachment_id: error.attachment_id as string & tags.Format<"uuid">,
        category_id: error.category_id as string & tags.Format<"uuid">,
        success: false,
        error_message: error.error,
        created_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
      } satisfies IDiscussionBoardAttachmentCategoryMapping.IResponseItem;
    });
    transformedResponse.mappings = [
      ...transformedResponse.mappings,
      ...errorItems,
    ];
  }
  return transformedResponse;
}
