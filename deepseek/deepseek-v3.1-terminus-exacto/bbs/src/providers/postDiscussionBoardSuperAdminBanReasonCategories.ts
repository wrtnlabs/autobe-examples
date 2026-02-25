import { IDiscussionBoardBanReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanReasonCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardBanReasonCategoryCollector } from "../collectors/DiscussionBoardBanReasonCategoryCollector";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardBanReasonCategoryTransformer } from "../transformers/DiscussionBoardBanReasonCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminBanReasonCategories(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardBanReasonCategory.ICreate;
}): Promise<IDiscussionBoardBanReasonCategory> {
  // Check if category name already exists among active categories
  const existing =
    await MyGlobal.prisma.discussion_board_ban_reason_categories.findFirst({
      where: {
        name: props.body.name,
        deleted_at: null,
      },
    });
  if (existing) {
    throw new HttpException("Category name already exists", 400);
  }
  const created =
    await MyGlobal.prisma.discussion_board_ban_reason_categories.create({
      data: await DiscussionBoardBanReasonCategoryCollector.collect({
        body: props.body,
      }),
      ...DiscussionBoardBanReasonCategoryTransformer.select(),
    });
  return await DiscussionBoardBanReasonCategoryTransformer.transform(created);
}
