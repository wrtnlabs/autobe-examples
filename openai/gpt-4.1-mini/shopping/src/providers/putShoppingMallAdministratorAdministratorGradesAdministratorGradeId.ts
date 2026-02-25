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
import { ShoppingMallAdministratorGradeTransformer } from "../transformers/ShoppingMallAdministratorGradeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdministratorAdministratorGradesAdministratorGradeId(props: {
  administrator: AdministratorPayload;
  administratorGradeId: string & tags.Format<"uuid">;
  body: IShoppingMallAdministratorGrade.IUpdate;
}): Promise<IShoppingMallAdministratorGrade> {
  // Authorization: assume props.administrator contains authorized administrator
  // Validate and prepare data to update
  const data: Partial<Prisma.shopping_mall_administrator_gradesUpdateInput> =
    {};
  if (props.body && typeof props.body.name === "string") {
    data.name = props.body.name;
  }
  if (props.body && typeof props.body.grade === "number") {
    data.grade = props.body.grade;
  }
  if (props.body && typeof props.body.superAdministrator === "boolean") {
    data.super_administrator = props.body.superAdministrator;
  }
  // Use transaction to update and then fetch updated record.
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_administrator_grades.findUniqueOrThrow({
      where: { id: props.administratorGradeId },
    });
    await tx.shopping_mall_administrator_grades.update({
      where: { id: props.administratorGradeId },
      data: data,
    });
    return await tx.shopping_mall_administrator_grades.findUniqueOrThrow({
      where: { id: props.administratorGradeId },
      ...ShoppingMallAdministratorGradeTransformer.select(),
    });
  });
  return await ShoppingMallAdministratorGradeTransformer.transform(updated);
}
