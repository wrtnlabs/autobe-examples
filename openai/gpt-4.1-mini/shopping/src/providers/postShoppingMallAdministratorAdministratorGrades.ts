import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallAdministratorGradeCollector } from "../collectors/ShoppingMallAdministratorGradeCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallAdministratorGradeTransformer } from "../transformers/ShoppingMallAdministratorGradeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorAdministratorGrades(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallAdministratorGrade.ICreate;
}): Promise<IShoppingMallAdministratorGrade> {
  try {
    const created =
      await MyGlobal.prisma.shopping_mall_administrator_grades.create({
        data: await ShoppingMallAdministratorGradeCollector.collect({
          body: props.body,
        }),
        ...ShoppingMallAdministratorGradeTransformer.select(),
      });
    return await ShoppingMallAdministratorGradeTransformer.transform(created);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes("name")
    ) {
      throw new HttpException("Administrator grade name must be unique", 400);
    }
    throw error;
  }
}
