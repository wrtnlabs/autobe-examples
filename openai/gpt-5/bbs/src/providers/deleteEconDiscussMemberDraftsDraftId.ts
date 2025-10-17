import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteEconDiscussMemberDraftsDraftId(props: {
  member: MemberPayload;
  draftId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, draftId } = props;

  const draft = await MyGlobal.prisma.econ_discuss_post_drafts.findUnique({
    where: { id: draftId },
    select: {
      id: true,
      econ_discuss_user_id: true,
      deleted_at: true,
    },
  });

  if (!draft) {
    throw new HttpException("Not Found", 404);
  }

  if (draft.econ_discuss_user_id !== member.id) {
    throw new HttpException(
      "Forbidden: You can only discard your own draft",
      403,
    );
  }

  if (draft.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.econ_discuss_post_drafts.update({
    where: { id: draftId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });

  return;
}
