import { IDiscussionBoardAttachmentCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardAttachmentCategoryCollector } from "../collectors/DiscussionBoardAttachmentCategoryCollector";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAttachmentCategoryTransformer } from "../transformers/DiscussionBoardAttachmentCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postDiscussionBoardSuperAdminAttachmentCategories(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardAttachmentCategory.ICreate;
}): Promise<IDiscussionBoardAttachmentCategory> {
  // 1. Check if category name already exists
  const existing =
    await MyGlobal.prisma.discussion_board_attachment_categories.findFirst({
      where: {
        name: props.body.name,
        deleted_at: null,
      },
    });
  if (existing) {
    throw new HttpException("Category name already exists", 400);
  }
  // 2. If parent_id is provided, verify it exists
  if (props.body.parent_id !== undefined && props.body.parent_id !== null) {
    const parent =
      await MyGlobal.prisma.discussion_board_attachment_categories.findFirst({
        where: {
          id: props.body.parent_id,
          deleted_at: null,
        },
      });
    if (!parent) {
      throw new HttpException("Parent category not found", 404);
    }
  }
  // 3. Create the category
  const created =
    await MyGlobal.prisma.discussion_board_attachment_categories.create({
      data: await DiscussionBoardAttachmentCategoryCollector.collect({
        body: props.body,
      }),
      ...DiscussionBoardAttachmentCategoryTransformer.select(),
    });
  // 4. Transform and return
  return await DiscussionBoardAttachmentCategoryTransformer.transform(created);
}
