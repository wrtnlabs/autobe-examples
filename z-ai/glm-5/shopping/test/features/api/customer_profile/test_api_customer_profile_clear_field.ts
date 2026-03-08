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

export async function test_api_customer_profile_clear_field(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test clearing a previously set profile field value.
   *
   * 1. Create customer with display_name set
   * 2. Update profile to clear display_name (set to null)
   * 3. Verify displayName is null after update
   * 4. Verify other profile fields remain intact
   */
  // 1. Create customer connection with initial display_name
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(authorized);
  // Store original values for verification
  const originalEmail = authorized.email;
  const originalId = authorized.id;
  // 2. Update profile to clear display_name (set to null)
  const updated = await api.functional.shoppingMall.customer.profile.update(
    customerConnection,
    {
      body: {
        display_name: null,
      } satisfies IShoppingMallCustomer.IUpdate,
    },
  );
  typia.assert(updated);
  // 3. Verify displayName is cleared (null)
  TestValidator.equals("displayName should be null", updated.displayName, null);
  // 4. Verify other fields remain intact
  TestValidator.equals(
    "email should remain unchanged",
    updated.email,
    originalEmail,
  );
  TestValidator.equals("id should remain unchanged", updated.id, originalId);
  // 5. Verify updatedAt reflects the update (should be different from createdAt or recent)
  TestValidator.predicate("updatedAt is valid date-time", () => {
    const updatedAt = new Date(updated.updatedAt);
    return !isNaN(updatedAt.getTime());
  });
}
