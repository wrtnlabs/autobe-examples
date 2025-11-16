import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteEconPolDiscussionBoardAdminEconPolDiscussionBoardAdminsAdminUsernameSessionsId(props: {
  admin: AdminPayload;
  adminUsername: string;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const adminRecord =
    await MyGlobal.prisma.econ_pol_discussion_board_admins.findUnique({
      where: { username: props.adminUsername },
      select: { id: true },
    });
  if (!adminRecord) {
    throw new HttpException("Admin not found", 404);
  }

  const existingSession =
    await MyGlobal.prisma.econ_pol_discussion_board_admin_sessions.findFirst({
      where: {
        id: props.id,
        econ_pol_discussion_board_admin_id: adminRecord.id,
      },
    });

  if (!existingSession) {
    throw new HttpException("Session not found", 404);
  }

  await MyGlobal.prisma.econ_pol_discussion_board_admin_sessions.delete({
    where: { id: props.id },
  });
}
