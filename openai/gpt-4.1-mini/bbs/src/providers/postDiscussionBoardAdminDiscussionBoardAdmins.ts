import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postDiscussionBoardAdminDiscussionBoardAdmins(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAdmin.ICreate;
}): Promise<IDiscussionBoardAdmin> {
  const existing = await MyGlobal.prisma.discussion_board_admin.findUnique({
    where: { email: props.body.email },
    select: { id: true },
  });

  if (existing !== null) {
    throw new HttpException("Email already exists", 409);
  }

  const passwordHash = await PasswordUtil.hash(props.body.password);

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.discussion_board_admin.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: passwordHash,
      nickname: props.body.nickname,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    email: created.email,
    nickname: created.nickname,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: null,
  };
}
