import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPolDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAttachment";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getEconPolDiscussionBoardMemberArticlesIdAttachments(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IEconPolDiscussionBoardAttachment.ISummary> {
  const attachments =
    await MyGlobal.prisma.econ_pol_discussion_board_attachments.findMany({
      where: { article: { id: props.id } },
      orderBy: { uploaded_at: "desc" },
    });

  if (attachments.length === 0) {
    throw new HttpException("Attachments not found", 404);
  }

  const attachment = attachments[0];

  return {
    id: attachment.id,
    type: attachment.type,
    url: attachment.url,
    file_name: attachment.file_name,
    uploaded_at: toISOStringSafe(attachment.uploaded_at),
  };
}
