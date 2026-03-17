import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallAdminTransformer } from "../transformers/ShoppingMallAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSuperAdminAdminsAdminIdDemote(props: {
  superAdmin: SuperadminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdmin> {
  // Self-demotion check: super administrators cannot demote themselves
  if (props.adminId === props.superAdmin.id) {
    throw new HttpException(
      "Forbidden: Super administrators cannot demote themselves",
      403,
    );
  }
  // Validate target exists and is currently a super administrator
  const target = await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
    where: { id: props.adminId },
    select: { id: true, grade: true },
  });
  if (target.grade !== "SUPER_ADMIN") {
    throw new HttpException(
      "Bad Request: Target administrator is not a super administrator",
      400,
    );
  }
  // Update grade from SUPER_ADMIN to ADMIN
  await MyGlobal.prisma.shopping_mall_admins.update({
    where: { id: props.adminId },
    data: {
      grade: "ADMIN",
      updated_at: new Date(),
    },
  });
  // Fetch and return updated administrator record
  const updated = await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
    where: { id: props.adminId },
    ...ShoppingMallAdminTransformer.select(),
  });
  return await ShoppingMallAdminTransformer.transform(updated);
}
