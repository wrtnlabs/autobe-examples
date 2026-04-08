import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_profile_update_display_name_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account with initial profile data
  const customerConnection: api.IConnection = { host: connection.host };
  const initialDisplayName = RandomGenerator.name();
  const initialPhoneNumber = RandomGenerator.mobile();
  const authorized: IEcommerceCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: initialDisplayName,
        phone_number: initialPhoneNumber,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceCustomer.IJoin,
    });
  typia.assert(authorized);
  // 2. Capture initial values for comparison
  const initialCreatedAt = authorized.created_at;
  const initialPhoneNumberValue = authorized.phone_number;
  // 3. Update only display_name (partial update)
  const newDisplayName = RandomGenerator.name();
  const updated: IEcommerceCustomer =
    await api.functional.ecommerce.customer.profile.update(customerConnection, {
      body: {
        display_name: newDisplayName,
      } satisfies IEcommerceCustomer.IUpdate,
    });
  typia.assert(updated);
  // 4. Validate display_name has been updated
  TestValidator.equals(
    "display name updated",
    updated.display_name,
    newDisplayName,
  );
  // 5. Validate phone_number remains unchanged
  TestValidator.equals(
    "phone number unchanged",
    updated.phone_number,
    initialPhoneNumberValue,
  );
  // 6. Validate updated_at is newer than created_at
  const createdAt = new Date(updated.created_at);
  const updatedAt = new Date(updated.updated_at);
  TestValidator.predicate(
    "updated_at is newer than created_at",
    updatedAt > createdAt,
  );
  // 7. Validate updated_at differs from initial created_at (proves update occurred)
  TestValidator.notEquals(
    "updated_at differs from created_at",
    updated.updated_at,
    updated.created_at,
  );
}
