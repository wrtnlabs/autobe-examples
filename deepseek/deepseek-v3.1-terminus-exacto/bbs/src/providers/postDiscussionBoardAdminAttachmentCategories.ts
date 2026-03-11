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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAttachmentCategoryTransformer } from "../transformers/DiscussionBoardAttachmentCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminAttachmentCategories(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAttachmentCategory.ICreate;
}): Promise<IDiscussionBoardAttachmentCategory> {
  const data = await DiscussionBoardAttachmentCategoryCollector.collect({
    body: props.body,
  });
  const created =
    await MyGlobal.prisma.discussion_board_attachment_categories.create({
      data,
      ...DiscussionBoardAttachmentCategoryTransformer.select(),
    });
  return await DiscussionBoardAttachmentCategoryTransformer.transform(created);
}
