import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postDiscussionBoardAdminDiscussionBoardCategories(props: {
  admin: AdminPayload;
  body: IDiscussionBoardDiscussionBoardCategory.ICreate;
}): Promise<IDiscussionBoardDiscussionBoardCategory> {
  const { body } = props;

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.discussion_board_categories.create({
    data: {
      id,
      name: body.name,
      description: body.description === undefined ? null : body.description,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    name: created.name,
    description:
      created.description === null ? null : (created.description ?? undefined),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null
        ? null
        : created.deleted_at !== undefined
          ? toISOStringSafe(created.deleted_at)
          : undefined,
  };
}
