import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAttachment";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function postEconomicBoardCitizenPostsPostIdAttachments(props: {
  citizen: CitizenPayload;
  postId: string;
  body: IEconomicBoardAttachment.ICreate;
}): Promise<IEconomicBoardAttachment> {
  const post = await MyGlobal.prisma.economic_board_posts.findUnique({
    where: { id: props.postId, deleted_at: null },
  });

  if (!post) {
    throw new HttpException("Post not found or deleted", 404);
  }

  const contentBytes = Buffer.byteLength(props.body);
  const filename = `att-${Date.now()}-${v4().substring(0, 8)}.bin`;
  const mimetype = "application/octet-stream";

  const attachment = await MyGlobal.prisma.economic_board_attachments.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      economic_board_post_id: props.postId,
      original_name: filename,
      sanitized_name: filename,
      mime_type: mimetype,
      file_size: contentBytes,
      storage_path: `/uploads/${v4()}.bin`,
      status: "uploaded",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return attachment.id;
}
