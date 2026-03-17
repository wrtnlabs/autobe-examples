import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallAdminOfCustomerTransformer } from "../transformers/ShoppingMallAdminOfCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminAdminsAdminIdOfCustomer(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdminOfCustomer> {
  // Step 1: Verify the target admin exists and is not deactivated
  await MyGlobal.prisma.shopping_mall_admins.findFirstOrThrow({
    where: {
      id: props.adminId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 2: Find the customer-origin linkage record (404 if admin was promoted from seller)
  const record =
    await MyGlobal.prisma.shopping_mall_admin_of_customers.findFirstOrThrow({
      where: { admin_id: props.adminId },
      ...ShoppingMallAdminOfCustomerTransformer.select(),
    });
  // Step 3: Transform and return
  return ShoppingMallAdminOfCustomerTransformer.transform(record);
}
