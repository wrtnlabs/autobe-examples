import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSuperAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdminOfSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallSuperAdminOfSellerTransformer } from "../transformers/ShoppingMallSuperAdminOfSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSuperAdminSuperAdminsSuperAdminIdOfSeller(props: {
  superAdmin: SuperadminPayload;
  superAdminId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSuperAdminOfSeller> {
  // Step 1: Verify the target super admin exists and is not deleted
  await MyGlobal.prisma.shopping_mall_super_admins.findFirstOrThrow({
    where: {
      id: props.superAdminId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 2: Find the seller-origin linkage record
  const record =
    await MyGlobal.prisma.shopping_mall_super_admin_of_sellers.findFirstOrThrow(
      {
        where: {
          super_admin_id: props.superAdminId,
        },
        ...ShoppingMallSuperAdminOfSellerTransformer.select(),
      },
    );
  // Step 3: Transform and return
  return ShoppingMallSuperAdminOfSellerTransformer.transform(record);
}
