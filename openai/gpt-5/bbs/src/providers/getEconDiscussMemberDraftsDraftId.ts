import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussPostDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostDraft";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getEconDiscussMemberDraftsDraftId(props: {
  member: MemberPayload;
  draftId: string & tags.Format<"uuid">;
}): Promise<IEconDiscussPostDraft> {
  const { member, draftId } = props;

  const row = await MyGlobal.prisma.econ_discuss_post_drafts.findFirst({
    where: {
      id: draftId,
      econ_discuss_user_id: member.id,
      deleted_at: null,
      author: {
        is: { deleted_at: null },
      },
    },
    select: {
      id: true,
      title: true,
      body: true,
      econ_discuss_post_id: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (row === null) {
    throw new HttpException("Not Found", 404);
  }

  return {
    id: row.id as string & tags.Format<"uuid">,
    title: row.title ?? null,
    body: row.body ?? null,
    post_id: row.econ_discuss_post_id
      ? (row.econ_discuss_post_id as string & tags.Format<"uuid">)
      : null,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  };
}
