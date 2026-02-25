import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEconomicPoliticalDiscussionBoardAdminTagsTagId(props: {
  admin: AdminPayload;
  tagId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existingTag =
    await MyGlobal.prisma.economic_political_discussion_board_tags.findUniqueOrThrow(
      {
        where: { id: props.tagId },
      },
    );
  if (existingTag.deleted_at) {
    throw new HttpException("Tag is already deleted", 409);
  }
  await MyGlobal.prisma.economic_political_discussion_board_tags.update({
    where: { id: props.tagId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
