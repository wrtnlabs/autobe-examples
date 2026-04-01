import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { ShoppingMallAdministratorTransformer } from "../transformers/ShoppingMallAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSuperAdministratorAdministratorsAdministratorIdPromote(props: {
  superAdministrator: SuperadministratorPayload;
  administratorId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdministrator> {
  const administrator =
    await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
      where: {
        id: props.administratorId,
        deleted_at: null,
      },
    });
  const latestGradeChange =
    await MyGlobal.prisma.shopping_mall_administrator_grade_changes.findFirst({
      where: {
        shopping_mall_administrator_id: props.administratorId,
      },
      orderBy: {
        created_at: "desc",
      },
    });
  if (latestGradeChange?.new_grade === "super_administrator") {
    throw new HttpException(
      "Administrator is already a super administrator",
      400,
    );
  }
  await MyGlobal.prisma.shopping_mall_administrator_grade_changes.create({
    data: {
      id: v4(),
      shopping_mall_administrator_id: props.administratorId,
      shopping_mall_super_administrator_id: props.superAdministrator.id,
      previous_grade: latestGradeChange?.new_grade ?? "administrator",
      new_grade: "super_administrator",
      reason: null,
      created_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
      where: {
        id: props.administratorId,
      },
      ...ShoppingMallAdministratorTransformer.select(),
    });
  return await ShoppingMallAdministratorTransformer.transform(updated);
}
