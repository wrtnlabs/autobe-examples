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
import { DiscussionBoardAdministratorGradeTransformer } from "../transformers/DiscussionBoardAdministratorGradeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdministratorAdministratorGrades(props: {
  superAdministrator: SuperadministratorPayload;
  body: IDiscussionBoardAdministratorGrade.IUpdate & {
    id: string & tags.Format<"uuid">;
  };
}): Promise<IDiscussionBoardAdministratorGrade> {
  const prisma = MyGlobal.prisma;
  if (props.body.id === undefined) {
    throw new HttpException("Administrator grade id is required", 400);
  }
  if (
    props.body.name === undefined &&
    props.body.description === undefined &&
    props.body.level === undefined
  ) {
    throw new HttpException(
      "At least one field must be provided to update",
      400,
    );
  }
  const data: {
    name?: string;
    description?: string;
    level?: number;
  } = {};
  if (props.body.name !== undefined) data.name = props.body.name;
  if (props.body.description !== undefined)
    data.description = props.body.description;
  if (props.body.level !== undefined) data.level = props.body.level;
  const updated = await prisma.discussion_board_administrator_grades.update({
    where: { id: props.body.id },
    data,
    include: {
      administrators: true,
      gradeChanges: true,
      oldGradePromotions: true,
      newGradePromotions: true,
    },
  });
  return await DiscussionBoardAdministratorGradeTransformer.transform(updated);
}
