import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardAdministratorTagsTagId(props: {
  administrator: AdministratorPayload;
  tagId: string & tags.Format<"uuid">;
}): Promise<void> {
  const tag = await MyGlobal.prisma.discussion_board_tags.findFirst({
    where: { id: props.tagId, deleted_at: null },
    select: { id: true },
  });
  if (tag === null) {
    throw new HttpException("Tag not found", 404);
  }
  await MyGlobal.prisma.discussion_board_tags.delete({
    where: { id: props.tagId },
  });
  return;
}
