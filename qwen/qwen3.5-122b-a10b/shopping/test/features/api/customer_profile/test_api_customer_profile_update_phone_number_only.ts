import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer profile update with phone number only.
 *
 * 1. Customer registers with initial display name
 * 2. Customer updates profile with only phone_number (display_name omitted)
 * 3. Verify phone_number is updated
 * 4. Verify display_name remains unchanged
 * 5. Verify snapshot is created with previous and current values
 */
export async function test_api_customer_profile_update_phone_number_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registers with initial display name
  const customerConnection: api.IConnection = { host: connection.host };
  const initialDisplayName = RandomGenerator.name();
  const initialPhoneNumber: string | null = null;
  const joinResult = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: initialDisplayName,
      phone_number: initialPhoneNumber,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(joinResult);
  // Store initial profile state
  const initialDisplayNameValue = joinResult.display_name;
  const initialPhoneNumberValue = joinResult.phone_number;
  // 2. Customer updates profile with only phone_number
  const newPhoneNumber = RandomGenerator.mobile();
  const updateResult =
    await api.functional.ecommerceMall.customer.profile.update(
      customerConnection,
      {
        body: {
          phone_number: newPhoneNumber,
        } satisfies IEcommerceMallCustomer.IUpdate,
      },
    );
  typia.assert(updateResult);
  // 3. Verify phone_number is updated
  TestValidator.equals(
    "phone number updated",
    updateResult.phone_number,
    newPhoneNumber,
  );
  // 4. Verify display_name remains unchanged
  TestValidator.equals(
    "display name preserved",
    updateResult.display_name,
    initialDisplayNameValue,
  );
  // 5. Verify snapshot is created (check snapshot endpoint exists and contains expected data)
  // Note: The snapshot validation would typically require a GET endpoint for snapshots
  // which is not provided in the API functions, so we validate the update response
  // contains the expected state changes
  TestValidator.notEquals(
    "profile changed",
    updateResult.updated_at,
    joinResult.updated_at,
  );
}
