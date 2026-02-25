import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import type { IShoppingMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSuspension";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_seller_approvals_create_seller_approval } from "../../../generate/generate_random_shopping_mall_administrator_seller_approvals_create_seller_approval";
import { generate_random_shopping_mall_administrator_seller_suspensions_create_seller_suspension } from "../../../generate/generate_random_shopping_mall_administrator_seller_suspensions_create_seller_suspension";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";
import { prepare_random_shopping_mall_seller_suspension } from "../../../prepare/prepare_random_shopping_mall_seller_suspension";

export async function test_api_seller_suspension_creation_without_approval(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests the attempt to suspend a seller who has not been approved yet.
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create a seller approval record with status 'pending' to represent unapproved seller
  const sellerApproval =
    await generate_random_shopping_mall_administrator_seller_approvals_create_seller_approval(
      adminConnection,
      {
        body: {
          status: "pending",
        },
      },
    );
  typia.assert(sellerApproval);
  // 3. Try to create seller suspension for the seller without approval (pending)
  // Expect failure because seller must be approved before suspension
  const suspensionBody: IShoppingMallSellerSuspension.ICreate = {
    seller_id: sellerApproval.shoppingMallSellerId,
    suspension_reason: "Suspension attempt without approval",
  };
  await TestValidator.error(
    "suspension creation should fail for unapproved seller",
    async () => {
      await generate_random_shopping_mall_administrator_seller_suspensions_create_seller_suspension(
        adminConnection,
        { body: suspensionBody },
      );
    },
  );
}
