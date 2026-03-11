import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAdminTransformer } from "../transformers/DiscussionBoardAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminAdminsAdminIdGrade(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdmin.IUpdateGrade;
}): Promise<IDiscussionBoardAdmin> {
  const callerAdmin = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: {
      member_id: props.admin.id,
      grade: "super",
      deleted_at: null,
    },
  });
  if (callerAdmin === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (callerAdmin.id === props.adminId) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow({
    where: {
      id: props.adminId,
      deleted_at: null,
    },
  });
  await MyGlobal.prisma.discussion_board_admins.update({
    where: {
      id: props.adminId,
    },
    data: {
      grade: props.body.grade,
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow({
      where: {
        id: props.adminId,
      },
      ...DiscussionBoardAdminTransformer.select(),
    });
  return await DiscussionBoardAdminTransformer.transform(updated);
}
