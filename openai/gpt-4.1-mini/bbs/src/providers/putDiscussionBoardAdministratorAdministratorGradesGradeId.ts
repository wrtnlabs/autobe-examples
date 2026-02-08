import { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdministratorAdministratorGradesGradeId(props: {
  administrator: AdministratorPayload;
  gradeId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdministratorGrade.IUpdate;
}): Promise<IDiscussionBoardAdministratorGrade> {
  const existingGrade =
    await MyGlobal.prisma.discussion_board_administrator_grades.findUnique({
      where: { id: props.gradeId },
    });
  if (!existingGrade) {
    throw new HttpException("Administrator grade not found", 404);
  }
  if ("name" in props.body && props.body.name !== undefined) {
    const nameConflict =
      await MyGlobal.prisma.discussion_board_administrator_grades.findFirst({
        where: {
          name: props.body.name ?? undefined,
          id: { not: props.gradeId },
          deleted_at: null,
        },
      });
    if (nameConflict) {
      throw new HttpException("Administrator grade name already exists", 409);
    }
  }
  const updateData: {
    name?: string;
    description?: string | Prisma.StringFieldUpdateOperationsInput;
    level?: number;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };
  if ("name" in props.body && props.body.name !== undefined) {
    updateData.name = props.body.name;
  }
  if ("description" in props.body) {
    if (props.body.description === null) {
      updateData.description = { set: null };
    } else if (props.body.description !== undefined) {
      updateData.description = props.body.description;
    }
  }
  if ("level" in props.body && typeof props.body.level === "number") {
    updateData.level = props.body.level;
  }
  const updated =
    await MyGlobal.prisma.discussion_board_administrator_grades.update({
      where: { id: props.gradeId },
      data: updateData,
    });
  return {
    id: updated.id,
    name: updated.name,
    description: updated.description ?? null,
    level: updated.level ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null ? toISOStringSafe(updated.deleted_at) : null,
  };
}
