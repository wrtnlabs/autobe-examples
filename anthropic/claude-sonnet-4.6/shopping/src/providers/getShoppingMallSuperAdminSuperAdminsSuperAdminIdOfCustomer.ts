import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallSuperAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdminOfCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallSuperAdminOfCustomerTransformer } from "../transformers/ShoppingMallSuperAdminOfCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSuperAdminSuperAdminsSuperAdminIdOfCustomer(props: {
  superAdmin: SuperadminPayload;
  superAdminId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSuperAdminOfCustomer> {
  // Confirm the target super admin exists and is not deleted
  await MyGlobal.prisma.shopping_mall_super_admins.findFirstOrThrow({
    where: {
      id: props.superAdminId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Query the customer-origin linkage record for this super admin.
  // If the super admin was not promoted from a customer account, throws → 404.
  const record =
    await MyGlobal.prisma.shopping_mall_super_admin_of_customers.findFirstOrThrow(
      {
        where: {
          super_admin_id: props.superAdminId,
        },
        ...ShoppingMallSuperAdminOfCustomerTransformer.select(),
      },
    );
  return await ShoppingMallSuperAdminOfCustomerTransformer.transform(record);
}
