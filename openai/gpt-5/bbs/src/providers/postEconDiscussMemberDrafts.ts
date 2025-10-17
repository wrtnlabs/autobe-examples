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

export async function postEconDiscussMemberDrafts(props: {
  member: MemberPayload;
  body: IEconDiscussPostDraft.ICreate;
}): Promise<IEconDiscussPostDraft> {
  const { member, body } = props;

  const now = toISOStringSafe(new Date());

  try {
    const created = await MyGlobal.prisma.econ_discuss_post_drafts.create({
      data: {
        id: v4(),
        econ_discuss_user_id: member.id,
        title: body.title ?? null,
        body: body.body ?? null,
        created_at: now,
        updated_at: now,
      },
    });

    return {
      id: created.id as string & tags.Format<"uuid">,
      title: created.title ?? null,
      body: created.body ?? null,
      post_id:
        created.econ_discuss_post_id === null
          ? null
          : (created.econ_discuss_post_id as string & tags.Format<"uuid">),
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
    };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      throw new HttpException(`Database error: ${err.code}`, 500);
    }
    throw new HttpException("Failed to create draft", 500);
  }
}
