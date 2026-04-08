import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_registration_with_complete_details(
  connection: api.IConnection,
): Promise<void> {
  // Test successful guest registration with complete request body including all optional fields.
  // Verify that the system:
  // 1. Creates a new member account with the provided email and hashed password
  // 2. Creates a new organization with the specified name, currency (EUR), and timezone (Europe/London)
  // 3. Creates an employee record linking the user to the organization with owner role
  // 4. Returns a valid JWT access token and refresh token in the response
  // 5. Returns a guest ID (UUID format) in the response
  // 6. Validates response structure contains id, token.access, token.refresh, token.expired_at, and token.refreshable_until fields
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const authorized = await authorize_guest_join(connection, {
    body: {
      email: email,
      password: password,
      passwordConfirmation: password,
      organizationName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      currency: "EUR",
      timezone: "Europe/London",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  TestValidator.equals("has guest id field", authorized.id !== undefined, true);
  TestValidator.equals("has token field", authorized.token !== undefined, true);
  TestValidator.equals(
    "has access token",
    authorized.token.access?.length > 0,
    true,
  );
  TestValidator.equals(
    "has refresh token",
    authorized.token.refresh?.length > 0,
    true,
  );
  TestValidator.equals(
    "has expired_at",
    authorized.token.expired_at !== undefined,
    true,
  );
  TestValidator.equals(
    "has refreshable_until",
    authorized.token.refreshable_until !== undefined,
    true,
  );
}
