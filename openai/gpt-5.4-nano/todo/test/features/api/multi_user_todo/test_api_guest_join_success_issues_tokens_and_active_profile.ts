import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_success_issues_tokens_and_active_profile(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test guest join issues authorization tokens and returns an active profile.
   *
   * Validates that the guest join endpoint successfully creates an authenticated
   * session for a guest actor, returns the expected IMultiUserTodoUserProfile.IAuthorized
   * payload, includes non-empty access/refresh tokens with expiration metadata,
   * and provides an active (not soft-deleted) profile where deleted_at is null.
   * Also ensures that password material is never included in the response.
   *
   * 1. Create guest join request input.
   * 2. Call POST /multiUserTodo/auth/guest/join using authorize_guest_join.
   * 3. Validate runtime response structure with typia.assert.
   * 4. Assert business expectations: token strings are non-empty and deleted_at is null.
   * 5. Assert security: no password field is present in the response.
   */
  // 1. Guest join (issue tokens)
  const guestConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    display_name: RandomGenerator.name(),
    password: "Password-1234!",
    href: "https://example.com/join",
    referrer: "https://example.com/from",
    ip: "127.0.0.1",
  } satisfies IMultiUserTodoUserProfile.IJoin;
  const authorized = await authorize_guest_join(guestConnection, {
    body: joinBody,
  });
  // 2. Response shape validation
  typia.assert(authorized);
  // 3. Token validations (business-level requirements)
  TestValidator.predicate(
    "access token is non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    authorized.token.refresh.length > 0,
  );
  // 4. Active profile validations
  TestValidator.equals("deleted_at is null", authorized.deleted_at, null);
  // 5. Security assertion: password material must not be returned
  TestValidator.predicate(
    "response does not include password field",
    Object.prototype.hasOwnProperty.call(authorized, "password") === false,
  );
}
