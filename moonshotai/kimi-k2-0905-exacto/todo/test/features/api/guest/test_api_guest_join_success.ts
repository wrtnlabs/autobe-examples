import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoGuest";

export async function test_api_guest_join_success(connection: api.IConnection) {
  const guest: ITodoGuest.IAuthorized =
    await api.functional.auth.guest.join(connection);
  typia.assert(guest);

  TestValidator.equals("guest session is active", guest.deleted_at, null);

  TestValidator.predicate("guest creation timestamp is valid", () => {
    return new Date(guest.created_at).getTime() > 0;
  });

  TestValidator.predicate("guest token is valid JWT", () => {
    return guest.token.access.length > 0 && guest.token.access.includes(".");
  });

  TestValidator.predicate("guest token has future expiration", () => {
    return new Date(guest.token.expired_at) > new Date();
  });

  TestValidator.predicate("refresh token has future expiration", () => {
    return new Date(guest.token.refreshable_until) > new Date();
  });

  TestValidator.predicate("connection has authorization header", () => {
    return connection.headers?.Authorization === guest.token.access;
  });

  TestValidator.predicate("guest and connection tokens match", () => {
    return connection.headers?.Authorization === guest.token.access;
  });
}
