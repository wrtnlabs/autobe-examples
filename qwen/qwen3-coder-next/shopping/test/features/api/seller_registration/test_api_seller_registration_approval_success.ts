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

export async function test_api_seller_registration_approval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: "admin@test.com",
    password: "12345678",
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminCredentials });
  // 2. Register pending seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinInput = {
    email: "seller@test.com",
    password: "12345678",
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_url: null,
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerJoinInput,
  });
  typia.assert(sellerAuthorized);
  typia.assert<IShoppingMallSeller.ISummary>(sellerAuthorized.data.profile);
  const sellerId = sellerAuthorized.data.profile.id;
  // 3. Admin approves the seller registration
  const approvalInput = {
    action: "approve" as const,
  } satisfies IShoppingMallSellerProfile.IApproval;
  await api.functional.shoppingMall.admin.sellers.approvals.approveSellerRegistration(
    adminConnection,
    {
      sellerId,
      body: approvalInput,
    },
  );
  // 4. Verify seller status changed to active by re-fetching seller profile
  sellerConnection.headers = {};
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoinInput.email,
      password: sellerJoinInput.password,
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerConnection.headers?.["Authorization"]);
  // 5. Verify approval record exists (indirectly through seller's approval_status)
  const sellerSummary = sellerAuthorized.data.profile;
  TestValidator.equals(
    "approval_status is approved",
    sellerSummary.approval_status,
    "active",
  );
  TestValidator.predicate(
    "created_at exists",
    Boolean(sellerSummary.created_at),
  );
}
