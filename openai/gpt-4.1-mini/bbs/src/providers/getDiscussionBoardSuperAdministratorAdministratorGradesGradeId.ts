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

export async function getDiscussionBoardSuperAdministratorAdministratorGradesGradeId(props: {
  superAdministrator: SuperadministratorPayload;
  gradeId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdministratorGrade> {
  const record =
    await MyGlobal.prisma.discussion_board_administrator_grades.findUniqueOrThrow(
      {
        where: { id: props.gradeId },
        select: {
          id: true,
          name: true,
          description: true,
          level: true,
          created_at: true,
          updated_at: true,
        },
      },
    );
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    level: record.level,
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString(),
  };
}
