import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

export async function test_api_guest_join_registration(
  connection: api.IConnection,
) {
  // 1. Prepare a request body for guest join with valid name, href, and referrer
  const body = {
    name: RandomGenerator.name(),
    href: "https://example.com/landing" satisfies string & tags.Format<"uri">,
    referrer: "https://google.com" satisfies string & tags.Format<"uri">,
  } satisfies IShoppingMallGuest.IJoin;

  // 2. Call the guest join API
  const guestAuthorized = await api.functional.auth.guest.join(connection, {
    body,
  });

  // 3. Assert the returned data has valid structure and types
  typia.assert(guestAuthorized);

  // 4. Validate guest ID existence
  TestValidator.predicate(
    "guest ID exists",
    typeof guestAuthorized.id === "string" && guestAuthorized.id.length > 0,
  );

  // 5. Validate created_at and updated_at timestamps are valid ISO string
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    typeof guestAuthorized.created_at === "string" &&
      !isNaN(Date.parse(guestAuthorized.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date-time",
    typeof guestAuthorized.updated_at === "string" &&
      !isNaN(Date.parse(guestAuthorized.updated_at)),
  );

  // 6. Validate deleted_at is null or valid ISO date-time if exists
  if (
    guestAuthorized.deleted_at !== null &&
    guestAuthorized.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "deleted_at is valid ISO date-time or null",
      typeof guestAuthorized.deleted_at === "string" &&
        !isNaN(Date.parse(guestAuthorized.deleted_at)),
    );
  } else {
    TestValidator.equals(
      "deleted_at is null or undefined",
      guestAuthorized.deleted_at,
      null,
    );
  }

  // 7. Validate token object and JWT tokens
  const token = guestAuthorized.token;
  typia.assert(token);

  TestValidator.predicate(
    "token.access is non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );

  // 8. Validate token expiry timestamps are valid ISO strings and in future
  TestValidator.predicate(
    "token.expired_at is valid ISO date-time",
    typeof token.expired_at === "string" &&
      !isNaN(Date.parse(token.expired_at)),
  );
  TestValidator.predicate(
    "token.refreshable_until is valid ISO date-time",
    typeof token.refreshable_until === "string" &&
      !isNaN(Date.parse(token.refreshable_until)),
  );

  // 9. Verify expired_at and refreshable_until are logically consistent (refreshable_until >= expired_at)
  TestValidator.predicate(
    "refreshable_until >= expired_at",
    new Date(token.refreshable_until) >= new Date(token.expired_at),
  );
}
