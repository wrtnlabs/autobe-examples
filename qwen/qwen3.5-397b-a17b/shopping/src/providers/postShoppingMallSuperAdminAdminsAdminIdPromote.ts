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

export async function postShoppingMallSuperAdminAdminsAdminIdPromote(props: {
  superAdmin: SuperadminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdmin> {
  const admin = await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
    where: { id: props.adminId },
    select: {
      id: true,
      grade: true,
      deleted_at: true,
    },
  });
  if (admin.deleted_at !== null) {
    throw new HttpException("Administrator account is deactivated", 400);
  }
  if (admin.grade === "SUPER_ADMIN") {
    throw new HttpException(
      "Target administrator is already a super administrator",
      400,
    );
  }
  await MyGlobal.prisma.shopping_mall_admins.update({
    where: { id: props.adminId },
    data: {
      grade: "SUPER_ADMIN",
      updated_at: new Date(),
    },
  });
  const updated = await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
    where: { id: props.adminId },
    ...ShoppingMallAdminTransformer.select(),
  });
  return await ShoppingMallAdminTransformer.transform(updated);
}
