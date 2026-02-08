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

export async function postShoppingMallAdministratorAdministratorGrades(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallAdministratorGrade.ICreate;
}): Promise<IShoppingMallAdministratorGrade> {
  const now = toISOStringSafe(new Date());
  // Extract body fields with type assertions to satisfy typesystem
  const { name, grade, super_administrator } = props.body as {
    name: string;
    grade: number;
    super_administrator: boolean;
  };
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const conflict = await prisma.shopping_mall_administrator_grades.findFirst({
      where: {
        OR: [{ name }, { grade }],
        deleted_at: null,
      },
    });
    if (conflict) {
      if (conflict.name === name) {
        throw new HttpException("Administrator grade name already exists", 400);
      } else {
        throw new HttpException(
          "Administrator grade value already exists",
          400,
        );
      }
    }
    const created = await prisma.shopping_mall_administrator_grades.create({
      data: {
        id: v4(),
        name,
        grade,
        super_administrator,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    return {
      id: created.id,
      name: created.name,
      grade: created.grade,
      super_administrator: created.super_administrator,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        created.deleted_at === null
          ? null
          : toISOStringSafe(created.deleted_at),
    };
  });
}
