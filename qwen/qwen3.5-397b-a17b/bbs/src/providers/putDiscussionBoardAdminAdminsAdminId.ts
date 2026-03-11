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

export async function putDiscussionBoardAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdmin.IUpdate;
}): Promise<IDiscussionBoardAdmin> {
  const requestingAdmin =
    await MyGlobal.prisma.discussion_board_admins.findFirstOrThrow({
      where: {
        member_id: props.admin.id,
        deleted_at: null,
      },
      select: {
        id: true,
        grade: true,
        member_id: true,
      },
    });
  if (requestingAdmin.grade !== "super") {
    throw new HttpException(
      "Forbidden: Only super administrators can update admin grades",
      403,
    );
  }
  const targetAdmin =
    await MyGlobal.prisma.discussion_board_admins.findFirstOrThrow({
      where: {
        id: props.adminId,
        deleted_at: null,
      },
      select: {
        id: true,
        member_id: true,
        grade: true,
      },
    });
  if (
    requestingAdmin.member_id === targetAdmin.member_id &&
    requestingAdmin.grade === "super" &&
    props.body.grade === "regular"
  ) {
    throw new HttpException(
      "Forbidden: Super administrators cannot demote themselves",
      403,
    );
  }
  if (
    props.body.grade !== undefined &&
    props.body.grade !== "regular" &&
    props.body.grade !== "super"
  ) {
    throw new HttpException(
      "Bad Request: Grade must be 'regular' or 'super'",
      400,
    );
  }
  await MyGlobal.prisma.discussion_board_admins.update({
    where: {
      id: props.adminId,
    },
    data: {
      ...(props.body.grade !== undefined && { grade: props.body.grade }),
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
