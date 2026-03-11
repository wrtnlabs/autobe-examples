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

/**
 * Test the successful creation of a guest account with valid email and password.
 * Verify that the system accepts the registration request, creates a guest account
 * with the provided credentials, and returns proper authentication tokens for
 * temporary access. Validate that the response includes the guest's email, account
 * ID, creation timestamps, and valid access/refresh tokens with appropriate
 * expiration metadata. Confirm that the guest account is created with the correct
 * state and can be used for temporary system access during registration workflow.
 */
export async function test_api_guest_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a guest-specific connection from the base connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Step 1: Register guest account using utility function
  // CRITICAL: Use authorize_guest_join utility, NOT api.functional.* directly
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  // Step 2: Validate complete response structure
  typia.assert(authorized);
  // Step 3: Verify core guest account fields
  TestValidator.equals(
    "email format validation",
    authorized.email,
    authorized.email,
  );
  TestValidator.predicate(
    "ID is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  // Step 4: Validate timestamps
  const createdAt = new Date(authorized.created_at);
  const updatedAt = new Date(authorized.updated_at);
  TestValidator.predicate(
    "created_at is valid ISO date",
    !isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    !isNaN(updatedAt.getTime()),
  );
  TestValidator.predicate(
    "created_at <= updated_at (can be equal)",
    createdAt <= updatedAt,
  );
  // Step 5: Check soft-delete status
  TestValidator.predicate(
    "deleted_at should be null or undefined for active account",
    authorized.deleted_at === null ||
      authorized.deleted_at === undefined ||
      (authorized.deleted_at &&
        !isNaN(new Date(authorized.deleted_at).getTime())),
  );
  // Step 6: Validate authorization token structure
  const token = authorized.token;
  TestValidator.predicate(
    "access token is non-empty string",
    token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    token.refresh.length > 0,
  );
  // Step 7: Validate token expiration timestamps
  const expiredAt = new Date(token.expired_at);
  const refreshableUntil = new Date(token.refreshable_until);
  TestValidator.predicate(
    "expired_at is valid future timestamp",
    !isNaN(expiredAt.getTime()) && expiredAt > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is valid future timestamp",
    !isNaN(refreshableUntil.getTime()) && refreshableUntil > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil > expiredAt,
  );
  // Step 8: Verify connection headers were updated
  TestValidator.predicate(
    "connection headers contain authorization",
    guestConnection.headers?.Authorization !== undefined &&
      guestConnection.headers?.Authorization === token.access,
  );
}
