import { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardAdministratorGradeCollector } from "../collectors/DiscussionBoardAdministratorGradeCollector";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { DiscussionBoardAdministratorGradeTransformer } from "../transformers/DiscussionBoardAdministratorGradeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdministratorAdministratorGrades(props: {
  superAdministrator: SuperadministratorPayload;
  body: IDiscussionBoardAdministratorGrade.ICreate;
}): Promise<IDiscussionBoardAdministratorGrade> {
  // Check uniqueness of name
  const existingByName =
    await MyGlobal.prisma.discussion_board_administrator_grades.findFirst({
      where: { name: props.body.name, deleted_at: null },
      select: { id: true },
    });
  if (existingByName) {
    throw new HttpException(
      `Administrator grade with name '${props.body.name}' already exists.`,
      400,
    );
  }
  // Check uniqueness of level
  const existingByLevel =
    await MyGlobal.prisma.discussion_board_administrator_grades.findFirst({
      where: { level: props.body.level, deleted_at: null },
      select: { id: true },
    });
  if (existingByLevel) {
    throw new HttpException(
      `Administrator grade with level '${props.body.level}' already exists.`,
      400,
    );
  }
  // Collect create data
  const data = await DiscussionBoardAdministratorGradeCollector.collect({
    body: props.body,
  });
  // Create record
  const created =
    await MyGlobal.prisma.discussion_board_administrator_grades.create({
      data,
    });
  // Fetch created record for full properties
  const record =
    await MyGlobal.prisma.discussion_board_administrator_grades.findUniqueOrThrow(
      {
        where: { id: created.id },
        ...DiscussionBoardAdministratorGradeTransformer.select(),
      },
    );
  // Transform to DTO
  return await DiscussionBoardAdministratorGradeTransformer.transform(record);
}
