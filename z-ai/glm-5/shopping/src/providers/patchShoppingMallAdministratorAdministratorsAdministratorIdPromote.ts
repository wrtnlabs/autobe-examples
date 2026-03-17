import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallAdministratorTransformer } from "../transformers/ShoppingMallAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorAdministratorsAdministratorIdPromote(props: {
  administrator: AdministratorPayload;
  administratorId: string;
  body: IShoppingMallAdministrator.IPromote;
}): Promise<IShoppingMallAdministrator> {
  // 1. Verify requesting admin is super administrator
  const requestingAdmin =
    await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
      where: { id: props.administrator.id },
      select: { id: true, grade: true },
    });
  if (requestingAdmin.grade !== "super") {
    throw new HttpException(
      "Only super administrators can perform promotions",
      403,
    );
  }
  // 2. Retrieve target administrator
  const targetAdmin =
    await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
      where: { id: props.administratorId },
      select: { id: true, grade: true, deleted_at: true },
    });
  // 3. Validate target is not deleted
  if (targetAdmin.deleted_at !== null) {
    throw new HttpException("Administrator not found", 404);
  }
  // 4. Validate target is regular administrator
  if (targetAdmin.grade !== "regular") {
    throw new HttpException(
      "Target administrator is already a super administrator",
      400,
    );
  }
  // 5. Self-promotion check
  if (props.administratorId === props.administrator.id) {
    throw new HttpException("Cannot promote yourself", 400);
  }
  // 6. Update grade to super
  const updated = await MyGlobal.prisma.shopping_mall_administrators.update({
    where: { id: props.administratorId },
    data: {
      grade: "super",
      updated_at: new Date(),
    },
    ...ShoppingMallAdministratorTransformer.select(),
  });
  return await ShoppingMallAdministratorTransformer.transform(updated);
}
