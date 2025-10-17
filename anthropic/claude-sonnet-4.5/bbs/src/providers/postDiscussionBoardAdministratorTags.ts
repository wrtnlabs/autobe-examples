import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function postDiscussionBoardAdministratorTags(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardTag.ICreate;
}): Promise<IDiscussionBoardTag> {
  const { body } = props;

  // Normalize tag name to lowercase for consistency
  const normalizedName = body.name.toLowerCase();

  // Check for existing tag with same name (case-insensitive uniqueness)
  const existingTag = await MyGlobal.prisma.discussion_board_tags.findFirst({
    where: {
      name: normalizedName,
      deleted_at: null,
    },
  });

  if (existingTag) {
    throw new HttpException("A tag with this name already exists", 409);
  }

  // Prepare values for creation and response
  const tagId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  // Create new tag
  await MyGlobal.prisma.discussion_board_tags.create({
    data: {
      id: tagId,
      name: normalizedName,
      description: body.description ?? undefined,
      status: "active",
      created_at: now,
      updated_at: now,
    },
  });

  // Return complete tag entity using prepared values
  return {
    id: tagId,
    name: normalizedName,
    description: body.description ?? undefined,
    status: "active",
    created_at: now,
    updated_at: now,
  };
}
