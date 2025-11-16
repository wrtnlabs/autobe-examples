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

export async function postEconPolDiscussionBoardMemberArticlesIdAttachments(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
  body: IEconPolDiscussionBoardAttachment.ICreate;
}): Promise<IEconPolDiscussionBoardAttachment> {
  const uploadedAt = toISOStringSafe(new Date()) satisfies string &
    tags.Format<"date-time"> as string & tags.Format<"date-time">;

  const attachment =
    await MyGlobal.prisma.econ_pol_discussion_board_attachments.create({
      data: {
        id: v4(),
        econ_pol_discussion_board_article_id: props.id satisfies string &
          tags.Format<"uuid"> as string & tags.Format<"uuid">,
        type: typia.assert<"image" | "file">(props.body.type),
        url: props.body.url satisfies string as string,
        file_name: props.body.fileName satisfies string as string,
        uploaded_at: uploadedAt,
      },
    });

  return {
    id: attachment.id satisfies string & tags.Format<"uuid"> as string &
      tags.Format<"uuid">,
    articleId:
      attachment.econ_pol_discussion_board_article_id satisfies string &
        tags.Format<"uuid"> as string & tags.Format<"uuid">,
    type: typia.assert<"image" | "file">(attachment.type),
    url: attachment.url satisfies string as string,
    fileName: attachment.file_name satisfies string as string,
    uploadedAt: toISOStringSafe(attachment.uploaded_at) satisfies string &
      tags.Format<"date-time"> as string & tags.Format<"date-time">,
  };
}
