import { IDiscussionBoardBanReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanReasonCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardBanReasonCategoryTransformer } from "../transformers/DiscussionBoardBanReasonCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminBanReasonCategoriesCategoryId(props: {
  superAdmin: SuperAdminPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardBanReasonCategory> {
  const category =
    await MyGlobal.prisma.discussion_board_ban_reason_categories.findUniqueOrThrow(
      {
        where: {
          id: props.categoryId,
          deleted_at: null,
        },
        ...DiscussionBoardBanReasonCategoryTransformer.select(),
      },
    );
  return DiscussionBoardBanReasonCategoryTransformer.transform(category);
}
