import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_profile_update_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Attempt profile update without authentication.
  // Call the update profile API with valid display name and phone number update data
  // but omit authentication token to validate that unauthorized access is denied.
  // Ensure proper HTTP 401 Unauthorized error is returned.
  // Generate valid profile update data
  const body = {
    displayName: RandomGenerator.name(),
    phoneNumber: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IUpdate;
  // Do NOT authorize the connection - use base connection
  // Expect an HTTP 401 Unauthorized error when calling updateProfile
  await TestValidator.httpError(
    "unauthorized access denied for profile update",
    401,
    async () => {
      await api.functional.shoppingMall.customer.profile.updateProfile(
        connection,
        {
          body,
        },
      );
    },
  );
}
