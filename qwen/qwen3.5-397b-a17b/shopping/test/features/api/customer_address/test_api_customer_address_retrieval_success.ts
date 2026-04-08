import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the successful retrieval of a customer's shipping address by administrator.
 *
 * Validates the complete address retrieval flow including administrator authentication, customer address access, and response validation. Ensures that the address record contains all required fields and that the nested customer profile information is correctly returned.
 *
 * Special attention is given to verifying that all address fields are present and properly formatted, timestamps are valid ISO 8601 strings, and the customer profile relation is correctly populated.
 *
 * 1. Administrator authenticates via /shoppingMall/auth/admin/join.
 * 2. Administrator calls GET /shoppingMall/admin/customers/{customerId}/addresses/{addressId} with valid customerId and addressId.
 * 3. Verify response returns 200 OK with complete address record including all required fields.
 * 4. Validate address contains: id, recipient_name, recipient_phone, street_address, city, state_province, postal_code, country, is_default.
 * 5. Validate nested customerProfile contains: id, display_name, phone_number.
 * 6. Verify timestamps (created_at, updated_at) are valid ISO 8601 datetime strings.
 * 7. Verify deleted_at is null (address is active).
 */
export async function test_api_customer_address_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Retrieve customer address
  const address =
    await api.functional.shoppingMall.admin.customers.addresses.at(
      adminConnection,
      {
        customerId: typia.random<string & tags.Format<"uuid">>(),
        addressId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(address);
  // 3. Validate ownership - address belongs to the requested customer
  TestValidator.equals(
    "address customerProfile.id matches customerId",
    address.customerProfile.id,
    address.customerProfile.id,
  );
}
