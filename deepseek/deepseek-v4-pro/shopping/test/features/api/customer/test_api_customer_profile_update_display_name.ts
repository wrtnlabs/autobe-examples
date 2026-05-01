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

/**
 * Test that an authenticated customer can update their public display name.
 *
 * Validates the core profile editing workflow where a customer changes their display name — the public-facing identity shown on reviews, profile pages, and across the platform. The test verifies that the update correctly modifies only the display_name field while preserving all other account properties.
 *
 * 1. Register a new customer via authorize_customer_join with an initial display name.
 * 2. Retrieve the initial profile data (id, email, display_name, phone_number, timestamps).
 * 3. Submit a profile update with a new display_name value.
 * 4. Validate that the response reflects the updated display_name.
 * 5. Confirm all other fields remain unchanged: id, email, phone_number, created_at.
 * 6. Verify the updated_at timestamp has been refreshed.
 */
export async function test_api_customer_profile_update_display_name(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, { body: {} });
  typia.assert(authorized);
  // Capture initial profile state
  const originalDisplayName = authorized.display_name;
  const originalEmail = authorized.email;
  const originalId = authorized.id;
  const originalPhoneNumber = authorized.phone_number;
  const originalCreatedAt = authorized.created_at;
  const originalUpdatedAt = authorized.updated_at;
  // 2. Update the display name
  const newDisplayName = RandomGenerator.name();
  const updated: IShoppingMallCustomer =
    await api.functional.shoppingMall.customer.profile.update(
      customerConnection,
      {
        body: {
          display_name: newDisplayName,
        } satisfies IShoppingMallCustomer.IUpdate,
      },
    );
  typia.assert(updated);
  // 3. Validate the update results
  TestValidator.equals(
    "display_name updated",
    updated.display_name,
    newDisplayName,
  );
  TestValidator.equals("id preserved", updated.id, originalId);
  TestValidator.equals("email preserved", updated.email, originalEmail);
  TestValidator.equals(
    "phone_number preserved",
    updated.phone_number,
    originalPhoneNumber,
  );
  TestValidator.equals(
    "created_at preserved",
    updated.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at refreshed",
    updated.updated_at,
    originalUpdatedAt,
  );
}
