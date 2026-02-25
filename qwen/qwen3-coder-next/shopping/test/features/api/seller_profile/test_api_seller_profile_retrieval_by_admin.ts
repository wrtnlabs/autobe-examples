import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register seller account with random test data
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_image_url:
      Math.random() > 0.5 ? null : RandomGenerator.alphaNumeric(32),
  } satisfies IShoppingMallSeller.IJoin;
  const registeredSeller = await authorize_seller_join(sellerConnection, {
    body: sellerData,
  });
  typia.assert(registeredSeller);
  // Verify seller is initially pending approval
  TestValidator.equals(
    "seller approval status is pending",
    registeredSeller.approval_status,
    "pending",
  );
  // Step 2: Admin approves seller registration
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData = {
    email: (typia.random<string>() satisfies string & tags.Format<"email"> & tags.MaxLength<255> as string & tags.Format<"email"> & tags.MaxLength<255>),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallAdmin.IJoin;
  const registeredAdmin = await authorize_admin_join(adminConnection, {
    body: adminData,
  });
  typia.assert(registeredAdmin);
  // Admin approves the seller registration
  await api.functional.shoppingMall.admin.sellers.approvals.approveSellerRegistration(
    adminConnection,
    {
      sellerId: registeredSeller.id,
      body: {
        action: "approve",
      },
    },
  );
  // Step 3: Login as administrator for profile retrieval
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: (adminData.email satisfies string & tags.Format<"email"> & tags.MaxLength<255> as string & tags.Format<"email"> & tags.MaxLength<255>),
      password: adminData.password,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // Step 4: Retrieve seller profile as administrator
  const retrievedSeller =
    await api.functional.shoppingMall.admin.admin.sellers.at(
      adminLoginConnection,
      {
        sellerId: registeredSeller.id,
      },
    );
  typia.assert(retrievedSeller);
  // Step 5: Validate retrieved seller profile matches original registration
  TestValidator.equals(
    "seller ID matches",
    retrievedSeller.id,
    registeredSeller.id,
  );
  TestValidator.equals(
    "shop name matches",
    retrievedSeller.shop_name,
    sellerData.shop_name,
  );
  TestValidator.equals(
    "shop description matches",
    retrievedSeller.shop_description,
    sellerData.shop_description,
  );
  TestValidator.equals(
    "logo image URL matches",
    retrievedSeller.logo_image_url,
    sellerData.logo_image_url,
  );
  TestValidator.equals(
    "approval status is approved",
    retrievedSeller.approval_status,
    "approved",
  );
  TestValidator.predicate(
    "has valid created_at timestamp",
    retrievedSeller.created_at
      ? /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
          retrievedSeller.created_at,
        )
      : false,
  );
  TestValidator.predicate(
    "has valid updated_at timestamp",
    retrievedSeller.updated_at
      ? /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
          retrievedSeller.updated_at,
        )
      : false,
  );
}
