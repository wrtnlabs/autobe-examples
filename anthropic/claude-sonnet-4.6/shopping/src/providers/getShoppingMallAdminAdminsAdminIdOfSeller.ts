import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallAdminOfSellerTransformer } from "../transformers/ShoppingMallAdminOfSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminAdminsAdminIdOfSeller(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdminOfSeller> {
  // Step 1: Verify the admin record exists and is not soft-deleted
  await MyGlobal.prisma.shopping_mall_admins.findFirstOrThrow({
    where: {
      id: props.adminId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 2: Retrieve the seller-origin linkage record
  // @@unique([admin_id]) guarantees at most one result
  const record =
    await MyGlobal.prisma.shopping_mall_admin_of_sellers.findUniqueOrThrow({
      where: { admin_id: props.adminId },
      ...ShoppingMallAdminOfSellerTransformer.select(),
    });
  // Step 3: Transform and return
  return ShoppingMallAdminOfSellerTransformer.transform(record);
}
