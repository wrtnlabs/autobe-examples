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

export async function postShoppingMallAdministratorAdministratorsAdministratorIdPromote(props: {
  administrator: AdministratorPayload;
  administratorId: string & tags.Format<"uuid">;
  body: IShoppingMallAdministrator.IPromote;
}): Promise<IShoppingMallAdministrator> {
  // Validate confirmation is explicitly true
  if (props.body.confirmation !== true) {
    throw new HttpException("Confirmation required", 400);
  }
  // Self-promotion check
  if (props.administrator.id === props.administratorId) {
    throw new HttpException("Cannot promote yourself", 400);
  }
  // Get requesting administrator's grade
  const requestingAdmin =
    await MyGlobal.prisma.shopping_mall_administrators.findFirst({
      where: {
        id: props.administrator.id,
        deleted_at: null,
      },
      select: {
        grade: true,
      },
    });
  if (requestingAdmin === null) {
    throw new HttpException("Requesting administrator not found", 404);
  }
  // Verify requesting administrator has super grade
  if (requestingAdmin.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  // Find target administrator
  const target = await MyGlobal.prisma.shopping_mall_administrators.findFirst({
    where: {
      id: props.administratorId,
      deleted_at: null,
    },
    ...ShoppingMallAdministratorTransformer.select(),
  });
  if (target === null) {
    throw new HttpException("Administrator not found", 404);
  }
  // Check if already super administrator
  if (target.grade === "super") {
    throw new HttpException(
      "Administrator is already super administrator",
      400,
    );
  }
  // Update grade to super
  const updated = await MyGlobal.prisma.shopping_mall_administrators.update({
    where: {
      id: props.administratorId,
    },
    data: {
      grade: "super",
      updated_at: new Date(),
    },
    ...ShoppingMallAdministratorTransformer.select(),
  });
  return ShoppingMallAdministratorTransformer.transform(updated);
}
