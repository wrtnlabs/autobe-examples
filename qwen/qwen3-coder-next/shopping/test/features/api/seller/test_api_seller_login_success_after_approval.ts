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

export async function test_api_seller_login_success_after_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for approval workflow
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Register seller account with pending approval status
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_url: null,
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerJoinInput,
  });
  typia.assert(sellerAuthorized);
  typia.assertGuard(sellerAuthorized.data.profile as any);
  // 3. Admin approves the seller registration
  await api.functional.shoppingMall.admin.sellers.approvals.approveSellerRegistration(
    adminConnection,
    {
      sellerId: sellerAuthorized.data.profile.id,
      body: {
        action: "approve",
      } satisfies IShoppingMallSellerProfile.IApproval,
    },
  );
  // 4. Verify seller can login after approval
  const sellerLoginInput = {
    email: sellerJoinInput.email,
    password: sellerJoinInput.password,
  } satisfies IShoppingMallSeller.ILogin;
  const sellerLoginResult = await authorize_seller_login(sellerConnection, {
    body: sellerLoginInput,
  });
  typia.assert(sellerLoginResult);
  // 5. Validate seller profile shows approved status
  typia.assertGuard(sellerLoginResult.data.profile as any);
  TestValidator.equals(
    "seller approval status is approved",
    sellerLoginResult.data.profile.approval_status,
    "approved",
  );
  // 6. Validate session record exists
  typia.assertGuard(sellerLoginResult.data.token as any);
  typia.assert(sellerLoginResult.token);
}
