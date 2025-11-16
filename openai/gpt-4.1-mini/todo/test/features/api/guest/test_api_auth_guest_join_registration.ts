import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListGuest";

export async function test_api_auth_guest_join_registration(
  connection: api.IConnection,
) {
  // We generate realistic guest registration data compliant with the schema
  const nickname = RandomGenerator.name(2).slice(0, 50);
  const clientVersion = `v${RandomGenerator.alphaNumeric(3)}`.slice(0, 20);
  // We'll generate a realistic URL for href and referrer
  const href = `https://${RandomGenerator.alphabets(5)}.example.com/login`;
  const referrer = `https://${RandomGenerator.alphabets(6)}.example.com/home`;

  // Compose the request body as defined by ITodoListTodoListGuest.ICreate
  const requestBody = {
    nickname,
    client_version: clientVersion,
    href: href,
    referrer: referrer,
  } satisfies ITodoListTodoListGuest.ICreate;

  // Call the join API to create guest user
  const result: ITodoListTodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: requestBody,
    });

  // Validate the returned guest authorization information
  typia.assert(result);
  TestValidator.predicate(
    "guest id is a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      result.id,
    ),
  );

  TestValidator.predicate(
    "access token format is string",
    typeof result.token.access === "string" && result.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token format is string",
    typeof result.token.refresh === "string" && result.token.refresh.length > 0,
  );

  // Validate expiration timestamps are ISO date-time format
  TestValidator.predicate(
    "expired_at is ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(result.token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(
      result.token.refreshable_until,
    ),
  );
}
