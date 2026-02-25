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

export async function getShoppingMallAdministratorAdministratorGradesAdministratorGradeId(props: {
  administrator: AdministratorPayload;
  administratorGradeId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdministratorGrade> {
  const gradeRecord =
    await MyGlobal.prisma.shopping_mall_administrator_grades.findFirstOrThrow({
      where: { id: props.administratorGradeId, deleted_at: null },
      ...ShoppingMallAdministratorGradeTransformer.select(),
    });
  return await ShoppingMallAdministratorGradeTransformer.transform(gradeRecord);
}
