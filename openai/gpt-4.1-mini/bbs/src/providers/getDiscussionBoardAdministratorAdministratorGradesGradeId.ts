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

export async function getDiscussionBoardAdministratorAdministratorGradesGradeId(props: {
  administrator: AdministratorPayload;
  gradeId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdministratorGrade> {
  const grade =
    await MyGlobal.prisma.discussion_board_administrator_grades.findUnique({
      where: { id: props.gradeId },
    });
  if (grade === null)
    throw new HttpException("Administrator grade not found", 404);
  return {
    id: grade.id,
    name: grade.name,
    description: grade.description,
    level: grade.level,
    created_at: toISOStringSafe(grade.created_at),
    updated_at: toISOStringSafe(grade.updated_at),
    deleted_at:
      grade.deleted_at !== null ? toISOStringSafe(grade.deleted_at) : null,
  };
}
