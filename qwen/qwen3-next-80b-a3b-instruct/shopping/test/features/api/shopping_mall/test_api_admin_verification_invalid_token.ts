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

export async function test_api_admin_verification_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin to establish system state
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Call verification endpoint with invalid token
  const response = await api.functional.shoppingMall.admin.verification.at(
    adminConnection,
    {
      token: RandomGenerator.alphaNumeric(64), // Invalid token - 64-char alphanumeric
    },
  );
  // The response should be a simple error object with 'type' and 'status'
  // Since IShoppingMallCustomerEmailVerification doesn't have these properties,
  // we need to assert it as the actual type returned
  // Create a local interface for the expected error response structure
  interface IVerificationErrorResponse {
    type: null;
    status: 'invalid';
  }
  // Use typia.assert to ensure the response matches our expected structure
  const verifiedResponse = typia.assert<IVerificationErrorResponse>(response);
  // 3. Validate response structure
  TestValidator.equals("token type is null", verifiedResponse.type, null);
  TestValidator.equals("token status is invalid", verifiedResponse.status, "invalid");
}