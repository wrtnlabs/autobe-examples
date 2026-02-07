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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardBanReasonCategoryTransformer } from "../transformers/DiscussionBoardBanReasonCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminBanReasonCategories(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardBanReasonCategory.ICreate;
}): Promise<IDiscussionBoardBanReasonCategory> {
  // Check if category name already exists
  const existingCategory =
    await MyGlobal.prisma.discussion_board_ban_reason_categories.findFirst({
      where: {
        name: props.body.name,
        deleted_at: null,
      },
    });
  if (existingCategory) {
    throw new HttpException(
      "Ban reason category with this name already exists",
      400,
    );
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
