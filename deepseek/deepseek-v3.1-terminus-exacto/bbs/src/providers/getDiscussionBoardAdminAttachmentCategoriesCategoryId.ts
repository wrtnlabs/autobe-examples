import { IDiscussionBoardAttachmentCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAttachmentCategoryTransformer } from "../transformers/DiscussionBoardAttachmentCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminAttachmentCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAttachmentCategory> {
  const category =
    await MyGlobal.prisma.discussion_board_attachment_categories.findUniqueOrThrow(
      {
        where: {
          id: props.categoryId,
          deleted_at: null,
        },
        ...DiscussionBoardAttachmentCategoryTransformer.select(),
      },
    );
  return await DiscussionBoardAttachmentCategoryTransformer.transform(category);
}
