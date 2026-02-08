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

export async function putShoppingMallAdministratorAdministratorGradesGradeId(props: {
  administrator: AdministratorPayload;
  gradeId: string & tags.Format<"uuid">;
  body: IShoppingMallAdministratorGrade.IUpdate;
}): Promise<IShoppingMallAdministratorGrade> {
  const existing =
    await MyGlobal.prisma.shopping_mall_administrator_grades.findUnique({
      where: { id: props.gradeId },
    });
  if (existing === null) {
    throw new HttpException("Administrator grade not found", 404);
  }
  if ((props.body as any).name !== undefined) {
    const duplicate =
      await MyGlobal.prisma.shopping_mall_administrator_grades.findFirst({
        where: { name: (props.body as any).name, id: { not: props.gradeId } },
      });
    if (duplicate !== null) {
      throw new HttpException("Role name must be unique", 400);
    }
  }
  if ((props.body as any).grade !== undefined) {
    const grade = (props.body as any).grade;
    if (!Number.isInteger(grade) || grade < 1 || grade > 1000) {
      throw new HttpException(
        "Grade must be an integer between 1 and 1000",
        400,
      );
    }
  }
  const updatedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const updated =
    await MyGlobal.prisma.shopping_mall_administrator_grades.update({
      where: { id: props.gradeId },
      data: {
        ...((props.body as any).name !== undefined && {
          name: (props.body as any).name,
        }),
        ...((props.body as any).grade !== undefined && {
          grade: (props.body as any).grade,
        }),
        ...((props.body as any).super_administrator !== undefined && {
          super_administrator: (props.body as any).super_administrator,
        }),
        deleted_at:
          (props.body as any).deleted_at === undefined
            ? null
            : (props.body as any).deleted_at,
        updated_at: updatedAt,
      },
    });
  return {
    id: updated.id,
    name: updated.name,
    grade: updated.grade,
    super_administrator: updated.super_administrator,
    deleted_at: updated.deleted_at === undefined ? null : updated.deleted_at,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
  };
}
