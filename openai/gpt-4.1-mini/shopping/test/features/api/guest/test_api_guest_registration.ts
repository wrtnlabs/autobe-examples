import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

export async function test_api_guest_registration(connection: api.IConnection) {
  // Generate minimal guest creation data with realistic IP address and current timestamp
  const guestCreate = {
    ip: [
      192,
      168,
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>
      >(),
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>
      >(),
    ].join("."),
    created_at: new Date().toISOString(),
  } satisfies IShoppingMallGuest.ICreate;

  // Call the guest join API to register new guest user
  const authorized: IShoppingMallGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, { body: guestCreate });
  typia.assert(authorized);

  // Validate the guest id is a valid UUID
  typia.assert<string & tags.Format<"uuid">>(authorized.id);

  // Validate token structure and contents
  typia.assert(authorized.token);
  typia.assert<string & tags.Format<"date-time">>(authorized.token.expired_at);
  typia.assert<string & tags.Format<"date-time">>(
    authorized.token.refreshable_until,
  );

  // Verify the expires_at is a valid date-time string
  typia.assert<string & tags.Format<"date-time">>(authorized.expires_at);

  // Additional predicates for clarity
  TestValidator.predicate(
    "token access is non-empty string",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh is non-empty string",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
}
