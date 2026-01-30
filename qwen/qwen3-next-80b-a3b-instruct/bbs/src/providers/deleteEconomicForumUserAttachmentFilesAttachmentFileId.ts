import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteEconomicForumUserAttachmentFilesAttachmentFileId(props: {
  user: UserPayload;
  attachmentFileId: string;
}): Promise<void> {
  const attachment =
    await MyGlobal.prisma.economic_forum_attachment_files.findUnique({
      where: {
        id: props.attachmentFileId,
        user_id: props.user.id,
      },
    });
  if (!attachment) {
    throw new HttpException("Attachment not found or not owned by user", 404);
  }
  await MyGlobal.prisma.economic_forum_attachment_files.delete({
    where: {
      id: props.attachmentFileId,
    },
  });
}
