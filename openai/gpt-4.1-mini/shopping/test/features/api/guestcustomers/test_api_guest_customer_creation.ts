import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

export async function test_api_guest_customer_creation(
  connection: api.IConnection,
) {
  // 1. Guest user self-registration to obtain authorization token
  const guestJoinBody = {
    name: RandomGenerator.name(),
    href: "https://example.com/guest-landing",
    referrer: "https://example.com/referrer",
  } satisfies IShoppingMallGuest.IJoin;

  const guest: IShoppingMallGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, { body: guestJoinBody });
  typia.assert(guest);

  // Validate guest token existence and format
  TestValidator.predicate(
    "guest token access presence",
    typeof guest.token.access === "string" && guest.token.access.length > 0,
  );
  TestValidator.predicate(
    "guest token refresh presence",
    typeof guest.token.refresh === "string" && guest.token.refresh.length > 0,
  );

  // 2. Create guest customer account
  const createCustomerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "GuestPassword123!",
    full_name: RandomGenerator.name(),
    href: "https://example.com/signup",
    referrer: "https://example.com/signup-referrer",
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer =
    await api.functional.shoppingMall.guest.customers.create(connection, {
      body: createCustomerBody,
    });
  typia.assert(customer);

  // Validate created customer fields
  TestValidator.predicate(
    "customer id is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      customer.id,
    ),
  );
  TestValidator.equals(
    "customer email matches input",
    customer.email,
    createCustomerBody.email,
  );
  TestValidator.equals(
    "customer full name matches input",
    customer.full_name,
    createCustomerBody.full_name,
  );
  TestValidator.predicate(
    "customer created_at valid ISO datetime",
    typeof customer.created_at === "string" && customer.created_at.length > 0,
  );
  TestValidator.predicate(
    "customer updated_at valid ISO datetime",
    typeof customer.updated_at === "string" && customer.updated_at.length > 0,
  );
  TestValidator.equals(
    "customer deleted_at is null or undefined",
    customer.deleted_at ?? null,
    null,
  );
}
