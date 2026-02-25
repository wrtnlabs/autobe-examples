import { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
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

export async function putDiscussionBoardSuperAdministratorAdministratorGradesGradeId(props: {
  superAdministrator: SuperadministratorPayload;
  gradeId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdministratorGrade.IUpdate;
}): Promise<IDiscussionBoardAdministratorGrade> {
  function getCurrentIsoString(): string & tags.Format<"date-time"> {
    return new Date().toISOString();
  }
  const existingGrade =
    await MyGlobal.prisma.discussion_board_administrator_grades.findUniqueOrThrow(
      {
        where: { id: props.gradeId },
      },
    );
  if (props.body.name !== undefined) {
    const duplicate =
      await MyGlobal.prisma.discussion_board_administrator_grades.findFirst({
        where: {
          name: props.body.name,
          NOT: { id: props.gradeId },
        },
      });
    if (duplicate !== null) {
      throw new HttpException(
        `Administrator grade name '${props.body.name}' already exists.`,
        409,
      );
    }
  }
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    return await tx.discussion_board_administrator_grades.update({
      where: { id: props.gradeId },
      data: {
        ...(props.body.name !== undefined && { name: props.body.name }),
        ...(props.body.description !== undefined && {
          description: props.body.description,
        }),
        ...(props.body.level !== undefined && { level: props.body.level }),
        updated_at: getCurrentIsoString(),
      },
    });
  });
  return {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    level: updated.level,
    created_at: updated.created_at.toISOString(),
    updated_at: updated.updated_at.toISOString(),
    deleted_at: updated.deleted_at ? updated.deleted_at.toISOString() : null,
  };
}
