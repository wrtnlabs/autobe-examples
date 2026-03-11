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

export async function deleteDiscussionBoardAdminStatusEnumsStatusEnumId(props: {
  admin: AdminPayload;
  statusEnumId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify status enum exists and is not already deleted
  const statusEnum =
    await MyGlobal.prisma.discussion_board_status_enums.findUniqueOrThrow({
      where: { id: props.statusEnumId },
    });
  if (statusEnum.deleted_at !== null) {
    throw new HttpException("Status enumeration value is already deleted", 400);
  }
  // Perform soft deletion using Prisma's now() function to avoid Date objects
  await MyGlobal.prisma.discussion_board_status_enums.update({
    where: { id: props.statusEnumId },
    data: { deleted_at: new Date().toISOString() },
  });
}
