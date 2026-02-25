import { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdministrators(props: {
  body: IDiscussionBoardSuperAdministrator.IRoleUpdate;
  customer: {
    id: string & tags.Format<"uuid">;
    kind: "superAdministrator";
  };
}): Promise<IDiscussionBoardSuperAdministrator.IUpdateResult> {
  const { administratorId, action } = props.body;
  const actingUserId = props.customer.id;
  if (action !== "promote" && action !== "demote") {
    throw new HttpException("Invalid action. Must be promote or demote.", 400);
  }
  if (action === "demote" && administratorId === actingUserId) {
    throw new HttpException(
      "Super administrators cannot demote themselves.",
      403,
    );
  }
  const regularGrade =
    await MyGlobal.prisma.discussion_board_administrator_grades.findFirstOrThrow(
      {
        where: { name: "regular" },
        select: { id: true },
      },
    );
  const superGrade =
    await MyGlobal.prisma.discussion_board_administrator_grades.findFirstOrThrow(
      {
        where: { name: "super" },
        select: { id: true },
      },
    );
  const target =
    await MyGlobal.prisma.discussion_board_administrators.findUniqueOrThrow({
      where: { id: administratorId },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        grade_id: true,
      },
    });
  const newGradeId = action === "promote" ? superGrade.id : regularGrade.id;
  await MyGlobal.prisma.discussion_board_administrators.update({
    where: { id: administratorId },
    data: { grade_id: newGradeId, updated_at: new Date() },
  });
  const updated =
    await MyGlobal.prisma.discussion_board_administrators.findUniqueOrThrow({
      where: { id: administratorId },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        grade_id: true,
      },
    });
  return {
    success: true,
    updatedAdministrator: {
      id: updated.id as string & tags.Format<"uuid">,
      email: updated.email,
      displayName: "",
      bio: "",
      createdAt: toISOStringSafe(updated.created_at),
      updatedAt: toISOStringSafe(updated.updated_at),
      deletedAt: updated.deleted_at
        ? toISOStringSafe(updated.deleted_at)
        : null,
    },
    "updatedAdministrator.id": null,
    "updatedAdministrator.email": null,
    "updatedAdministrator.displayName": null,
    "updatedAdministrator.bio": null,
    "updatedAdministrator.createdAt": null,
    "updatedAdministrator.updatedAt": null,
    "updatedAdministrator.deletedAt": null,
  };
}
