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

export async function putEconDiscussMemberDraftsDraftId(props: {
  member: MemberPayload;
  draftId: string & tags.Format<"uuid">;
  body: IEconDiscussPostDraft.IUpdate;
}): Promise<IEconDiscussPostDraft> {
  const { member, draftId, body } = props;

  const existing = await MyGlobal.prisma.econ_discuss_post_drafts.findFirst({
    where: {
      id: draftId,
      deleted_at: null,
    },
    select: {
      id: true,
      econ_discuss_user_id: true,
    },
  });

  if (!existing) {
    throw new HttpException("Not Found", 404);
  }
  if (existing.econ_discuss_user_id !== member.id) {
    throw new HttpException("Forbidden", 403);
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.econ_discuss_post_drafts.update({
    where: { id: draftId },
    data: {
      title: body.title ?? undefined,
      body: body.body ?? undefined,
      updated_at: now,
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

  return {
    id: updated.id as string & tags.Format<"uuid">,
    title: updated.title ?? null,
    body: updated.body ?? null,
    post_id:
      updated.econ_discuss_post_id === null
        ? null
        : (updated.econ_discuss_post_id as string & tags.Format<"uuid">),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
  };
}
