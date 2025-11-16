import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteEconPolDiscussionBoardAdminEconPolDiscussionBoardAdminsAdminUsername(props: {
  admin: AdminPayload;
  adminUsername: string;
}): Promise<void> {
  const existing =
    await MyGlobal.prisma.econ_pol_discussion_board_admins.findUnique({
      where: { username: props.adminUsername },
    });

  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Administrator account not found", 404);
  }

  await MyGlobal.prisma.econ_pol_discussion_board_admins.delete({
    where: { username: props.adminUsername },
  });
}
