import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
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

export async function getShoppingMallAdministratorAdministratorGradesGradeId(props: {
  administrator: AdministratorPayload;
  gradeId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdministratorGrade> {
  const grade =
    await MyGlobal.prisma.shopping_mall_administrator_grades.findFirst({
      where: { id: props.gradeId },
    });
  if (!grade) {
    throw new HttpException("Administrator grade not found", 404);
  }
  return {
    id: grade.id,
    name: grade.name,
    grade: grade.grade,
    super_administrator: grade.super_administrator,
    created_at: toISOStringSafe(grade.created_at),
    updated_at: toISOStringSafe(grade.updated_at),
    deleted_at:
      grade.deleted_at === null ? null : toISOStringSafe(grade.deleted_at),
  };
}
