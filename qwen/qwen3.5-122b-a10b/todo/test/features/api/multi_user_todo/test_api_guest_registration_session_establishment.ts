import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_registration_session_establishment(
  connection: api.IConnection,
): Promise<void> {
  // Create guest-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Register guest user and establish session
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  // Validate response structure with typia
  typia.assert(authorized);
  // Validate guest account information
  TestValidator.predicate(
    "guest id is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  TestValidator.predicate(
    "guest email is valid",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authorized.email),
  );
  TestValidator.predicate(
    "created_at is valid ISO 8601 date",
    !isNaN(Date.parse(authorized.created_at)),
  );
  // Validate token structure
  TestValidator.predicate(
    "access token is non-empty string",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid ISO 8601 date",
    !isNaN(Date.parse(authorized.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO 8601 date",
    !isNaN(Date.parse(authorized.token.refreshable_until)),
  );
  // Validate tokens expire in the future
  const now = new Date();
  TestValidator.predicate(
    "access token expires in future",
    new Date(authorized.token.expired_at) > now,
  );
  TestValidator.predicate(
    "refreshable_until is in future",
    new Date(authorized.token.refreshable_until) > now,
  );
  // Validate refreshable_until is after expired_at
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    new Date(authorized.token.refreshable_until) >
      new Date(authorized.token.expired_at),
  );
}
