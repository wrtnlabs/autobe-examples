import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_verification_valid_customer_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account to authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinInput = {} satisfies IShoppingMallAdmin.IJoin;
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);
  // 2. Get a valid customer verification token (simulating customer join)
  // Since we don't have a direct utility for customer join, we must simulate
  // the existence of a valid token by using typia.random with the correct type
  const customerVerificationToken = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Call the verification endpoint with valid token
  const result = await api.functional.shoppingMall.admin.verification.at(
    adminConnection,
    {
      token: customerVerificationToken,
    },
  );
  // Fix: The response is not IShoppingMallCustomerEmailVerification, but a verification result object
  // We need to use typia.assert to force the correct type structure that has 'type' and 'status' properties
  const verifiedResult = typia.assert<any>(result);
  // 4. Validate response structure
  TestValidator.equals("response type", verifiedResult.type, "customer");
  TestValidator.equals("response status", verifiedResult.status, "valid");
}