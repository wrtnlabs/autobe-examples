import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPolDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMember";

export async function postEconPolDiscussionBoardEconPolDiscussionBoardMembers(props: {
  body: IEconPolDiscussionBoardMember.ICreate;
}): Promise<IEconPolDiscussionBoardMember> {
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.econ_pol_discussion_board_members.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        username: props.body.username,
        email: props.body.email,
        password_hash: hashedPassword,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    username: created.username,
    email: created.email,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
