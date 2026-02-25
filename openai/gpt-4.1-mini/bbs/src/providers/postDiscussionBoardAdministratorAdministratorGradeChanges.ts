import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardAdministratorGradeChangeCollector } from "../collectors/DiscussionBoardAdministratorGradeChangeCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardAdministratorGradeChangeTransformer } from "../transformers/DiscussionBoardAdministratorGradeChangeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdministratorAdministratorGradeChanges(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardAdministratorGradeChange.ICreate;
}): Promise<IDiscussionBoardAdministratorGradeChange> {
  const currentAdmin =
    await MyGlobal.prisma.discussion_board_administrators.findUniqueOrThrow({
      where: { id: props.administrator.id },
      select: {
        id: true,
        grade: { select: { id: true, name: true } },
        deleted_at: true,
      },
    });
  if (currentAdmin.deleted_at !== null) {
    throw new HttpException(
      "Unauthorized: Your administrator account is deleted",
      403,
    );
  }
  if (currentAdmin.grade.name !== "super administrator") {
    throw new HttpException(
      "Forbidden: Only super administrators can change administrator grades",
      403,
    );
  }
  const targetAdmin =
    await MyGlobal.prisma.discussion_board_administrators.findUniqueOrThrow({
      where: { id: props.body.discussion_board_administrator_id },
      select: {
        id: true,
        grade: { select: { id: true, name: true } },
        deleted_at: true,
      },
    });
  if (targetAdmin.deleted_at !== null) {
    throw new HttpException("Target administrator account is deleted", 400);
  }
  if (
    targetAdmin.id === props.administrator.id &&
    targetAdmin.grade.name === "super administrator" &&
    props.body.discussion_board_administrator_grade_id !== targetAdmin.grade.id
  ) {
    throw new HttpException(
      "Forbidden: Super administrators cannot demote themselves",
      403,
    );
  }
  await MyGlobal.prisma.discussion_board_administrator_grades.findUniqueOrThrow(
    {
      where: { id: props.body.discussion_board_administrator_grade_id },
    },
  );
  const data = await DiscussionBoardAdministratorGradeChangeCollector.collect({
    body: props.body,
  });
  const created =
    await MyGlobal.prisma.discussion_board_administrator_grade_changes.create({
      data,
    });
  const record =
    await MyGlobal.prisma.discussion_board_administrator_grade_changes.findUniqueOrThrow(
      {
        where: { id: created.id },
        select:
          DiscussionBoardAdministratorGradeChangeTransformer.select().select,
      },
    );
  return await DiscussionBoardAdministratorGradeChangeTransformer.transform(
    record,
  );
}
