import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

export async function test_api_shopping_mall_guest_customer_creation(
  connection: api.IConnection,
) {
  // 1. Authenticate as guest user to obtain authorization token
  const guestJoinBody = {
    name: RandomGenerator.name(),
    href: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
    referrer: `https://referrer.com/${RandomGenerator.alphaNumeric(8)}`,
  } satisfies IShoppingMallGuest.IJoin;

  const guestAuthorized: IShoppingMallGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, { body: guestJoinBody });
  typia.assert(guestAuthorized);

  // Ensure Authorization header injected properly
  TestValidator.predicate(
    "Authorization token presence",
    typeof guestAuthorized.token.access === "string" &&
      guestAuthorized.token.access.length > 0,
  );

  // 2. Prepare guest customer creation body
  // Generate realistic email in format (using random name + domain)
  const guestEmail: string = `${RandomGenerator.name(
    1,
  ).toLowerCase()}@guest.test`;
  const guestFullName: string = RandomGenerator.name();
  const guestPassword: string = RandomGenerator.alphaNumeric(12);

  const guestCreateBody = {
    email: guestEmail,
    password: guestPassword,
    full_name: guestFullName,
    href: guestJoinBody.href,
    referrer: guestJoinBody.referrer,
  } satisfies IShoppingMallCustomer.ICreate;

  // 3. Create guest customer record
  const guestCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.guest.customers.create(connection, {
      body: guestCreateBody,
    });
  typia.assert(guestCustomer);

  // 4. Validate key fields presence and format
  TestValidator.predicate(
    "guestCustomer.id is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      guestCustomer.id,
    ),
  );
  TestValidator.equals(
    "guestCustomer email matches",
    guestCustomer.email,
    guestCreateBody.email,
  );
  TestValidator.predicate(
    "guestCustomer full_name presence",
    typeof guestCustomer.full_name === "string" &&
      guestCustomer.full_name.length > 0,
  );
  TestValidator.predicate(
    "guestCustomer created_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      guestCustomer.created_at,
    ),
  );
  TestValidator.predicate(
    "guestCustomer updated_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      guestCustomer.updated_at,
    ),
  );
  TestValidator.equals(
    "guestCustomer deleted_at is null",
    guestCustomer.deleted_at,
    null,
  );
}
