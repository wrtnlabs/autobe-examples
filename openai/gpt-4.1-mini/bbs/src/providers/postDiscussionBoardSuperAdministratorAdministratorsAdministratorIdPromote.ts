import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdministratorAdministratorsAdministratorIdPromote(props: {
  superAdministrator: SuperadministratorPayload;
  administratorId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdministrator> {
  if (props.superAdministrator.id === props.administratorId) {
    throw new HttpException("Self-promotion is forbidden", 403);
  }
  const administrator =
    await MyGlobal.prisma.discussion_board_administrators.findUnique({
      where: { id: props.administratorId },
    });
  if (!administrator) {
    throw new HttpException("Administrator not found", 404);
  }
  const superAdminGrade =
    await MyGlobal.prisma.discussion_board_administrator_grades.findFirst({
      where: { name: "super" },
    });
  if (!superAdminGrade) {
    throw new HttpException("Super administrator grade not configured", 500);
  }
  if (administrator.grade_id === superAdminGrade.id) {
    throw new HttpException(
      "Administrator is already a super administrator",
      400,
    );
  }
  const updatedAdministrator =
    await MyGlobal.prisma.discussion_board_administrators.update({
      where: { id: props.administratorId },
      data: { grade_id: superAdminGrade.id },
    });
  const timestamp = toISOStringSafe(new Date());
  await MyGlobal.prisma.discussion_board_administrator_promotions.create({
    data: {
      id: v4(),
      administrator: { connect: { id: props.administratorId } },
      oldGrade: { connect: { id: administrator.grade_id } },
      newGrade: { connect: { id: superAdminGrade.id } },
      created_at: timestamp,
      updated_at: timestamp,
    },
  });
  return updatedAdministrator;
}
