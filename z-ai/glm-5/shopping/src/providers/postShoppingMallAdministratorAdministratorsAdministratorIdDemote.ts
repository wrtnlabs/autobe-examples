import { IEAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEAdministratorGrade";
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

export async function postShoppingMallAdministratorAdministratorsAdministratorIdDemote(props: {
  administrator: AdministratorPayload;
  administratorId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdministrator> {
  // 1. Authorization: Check if authenticated admin is super
  const currentAdmin =
    await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
      where: { id: props.administrator.id },
      select: { id: true, grade: true },
    });
  if (currentAdmin.grade !== "super") {
    throw new HttpException(
      "Only super administrators can demote other administrators",
      403,
    );
  }
  // 2. Find target administrator
  const targetAdmin =
    await MyGlobal.prisma.shopping_mall_administrators.findUnique({
      where: { id: props.administratorId },
      select: { id: true, grade: true, deleted_at: true },
    });
  if (targetAdmin === null || targetAdmin.deleted_at !== null) {
    throw new HttpException("Administrator not found", 404);
  }
  // 3. Self-demotion check
  if (targetAdmin.id === props.administrator.id) {
    throw new HttpException(
      "Self-demotion is not permitted. Contact another super administrator.",
      400,
    );
  }
  // 4. Grade check - target must be super
  if (targetAdmin.grade !== "super") {
    throw new HttpException(
      "Target administrator is not a super administrator.",
      400,
    );
  }
  // 5. Count super administrators - must have at least 2 to demote one
  const superAdminCount =
    await MyGlobal.prisma.shopping_mall_administrators.count({
      where: {
        grade: "super",
        deleted_at: null,
      },
    });
  if (superAdminCount <= 1) {
    throw new HttpException(
      "Cannot demote the last super administrator. At least one super administrator must exist.",
      400,
    );
  }
  // 6. Perform demotion
  const updated = await MyGlobal.prisma.shopping_mall_administrators.update({
    where: { id: props.administratorId },
    data: {
      grade: "regular",
      updated_at: new Date(),
    },
    ...ShoppingMallAdministratorTransformer.select(),
  });
  // 7. Return response using transformer
  return await ShoppingMallAdministratorTransformer.transform(updated);
}
