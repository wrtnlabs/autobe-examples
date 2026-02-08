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

export async function postDiscussionBoardAdministratorAdministratorGrades(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardAdministratorGrade.ICreate;
}): Promise<IDiscussionBoardAdministratorGrade> {
  const { prisma } = MyGlobal;
  // Check uniqueness of the grade name
  const existingGrade =
    await prisma.discussion_board_administrator_grades.findFirst({
      where: {
        name: (props.body as any).name,
        deleted_at: null,
      },
    });
  if (existingGrade !== null) {
    throw new HttpException("Administrator grade name already exists", 409);
  }
  // Generate timestamp string in ISO 8601 format
  const nowISOString: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  // Create new grade entry atomically
  const created = await prisma.$transaction(async (tx) => {
    const id: string & tags.Format<"uuid"> = v4();
    return tx.discussion_board_administrator_grades.create({
      data: {
        id,
        name: (props.body as any).name,
        description: (props.body as any).description,
        level: (props.body as any).level,
        created_at: nowISOString,
        updated_at: nowISOString,
        deleted_at: null,
      },
    });
  });
  return {
    id: created.id,
    name: created.name,
    description: created.description,
    level: created.level,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at,
  };
}
