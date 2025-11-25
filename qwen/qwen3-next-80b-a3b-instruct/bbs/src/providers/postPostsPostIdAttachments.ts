import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAttachment";

export async function postPostsPostIdAttachments(props: {
  postId: string;
  body: IEconomicBoardAttachment.ICreate;
}): Promise<IEconomicBoardAttachment> {
  const attachment = await MyGlobal.prisma.economic_board_attachments.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      economic_board_post_id: props.postId,
      original_name: "" as any,
      sanitized_name: "" as any,
      file_size: 0 as any,
      mime_type: "" as any,
      storage_path: "" as any,
      status: "uploaded",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return attachment.id as IEconomicBoardAttachment;
}
