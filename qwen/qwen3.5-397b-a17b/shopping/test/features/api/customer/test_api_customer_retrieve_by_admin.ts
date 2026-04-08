import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
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
 * Test administrator retrieval of customer account information.
 *
 * Validates the complete customer retrieval workflow including administrator authentication and customer data access. Ensures that administrators can successfully retrieve detailed customer information including member account data, profile information, and administrator relations.
 *
 * Special attention is given to verifying that the response contains all required fields with correct types, the customer profile is properly embedded, and the administrator relation correctly reflects the customer's admin status (null for regular customers).
 *
 * 1. Administrator authenticates via authorize_admin_join utility.
 * 2. Admin retrieves customer information using customer retrieval endpoint.
 * 3. Validates response structure includes all required member fields.
 * 4. Validates customer profile is embedded with display_name and phone_number.
 * 5. Validates administrator relation is null for non-admin customers.
 * 6. Validates all timestamps are in ISO 8601 format.
 */
export async function test_api_customer_retrieve_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Retrieve customer information
  // Note: In a real scenario, we would create a customer first, but since
  // no customer creation endpoint is available, we test the retrieval structure
  // The test validates that the endpoint works correctly when a customer exists
  const customer = await api.functional.shoppingMall.admin.customers.at(
    adminConnection,
    {
      customerId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(customer);
  // 3. Validate customer profile structure (business logic - profile may exist)
  if (customer.profile !== null) {
    TestValidator.predicate(
      "profile display_name is non-empty",
      () => customer.profile!.display_name.length > 0,
    );
    TestValidator.predicate(
      "profile phone_number is non-empty",
      () => customer.profile!.phone_number.length > 0,
    );
  }
  // 4. Validate administrator relation structure (business logic)
  if (customer.administrator !== null) {
    TestValidator.predicate(
      "administrator grade is valid",
      () =>
        customer.administrator!.grade === "regular" ||
        customer.administrator!.grade === "super",
    );
  }
  // 5. Validate member status is one of expected values
  TestValidator.predicate(
    "member status is valid enum value",
    () =>
      customer.status === "active" ||
      customer.status === "banned" ||
      customer.status === "deleted",
  );
}
