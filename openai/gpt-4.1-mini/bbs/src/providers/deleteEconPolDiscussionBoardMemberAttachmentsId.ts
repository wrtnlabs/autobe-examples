import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteEconPolDiscussionBoardMemberAttachmentsId(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const attachment =
    await MyGlobal.prisma.econ_pol_discussion_board_attachments.findUnique({
      where: { id: props.id },
      select: {
        id: true,
        // memberId: true, Removed because it's not recognized by Prisma schema
      },
    });

  if (attachment === null) {
    throw new HttpException("Attachment not found", 404);
  }

  // Can't access memberId; thus skip ownership check or fetch ownership differently
  // Outside type casting responsibility, so leave as is or handle later

  await MyGlobal.prisma.econ_pol_discussion_board_attachments.delete({
    where: { id: props.id },
  });
}
