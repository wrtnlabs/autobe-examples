import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
/**
 * Validate the guest user registration workflow.
 *
 * This test validates the process of registering a guest user by submitting a
 * unique guest identifier. It ensures that the system creates a new temporary
 * guest account, and returns an authorization token with appropriate token
 * details as well as guest user information.
 *
 * This verifies the initial authentication step for guest users, enabling
 * subsequent authenticated guest session activities.
 *
 * Steps:
 *
 * 1. Create a new guest-specific connection based on the base connection.
 * 2. Call the authorize_guest_join utility function with a generated unique guest
 *    identifier.
 * 3. Upon success, validate that the returned data structure matches
 *    ITodoAppGuest.IAuthorized including valid UUID, timestamps, and token
 *    contents.
 * 4. Typia.assert() is used for runtime type validation to guarantee perfect API
 *    contract adherence.
 */
export async function test_api_guest_user_registration(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a guest-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Step 2: Perform guest join/authentication
  const authorizedGuest: ITodoAppGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {
      body: {
        guestIdentifier: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  // The utility function updates guestConnection.headers.Authorization internally
  // Step 3: Validate the returned data conforms to the IAuthorized schema
  typia.assert(authorizedGuest);
  // Step 4: Further assertions can rely on typia.assert guarantee
  // Ensure id is a string uuid
  TestValidator.predicate(
    "guest id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      authorizedGuest.id,
    ),
  );
  // Ensure guestIdentifier is a non-empty string
  TestValidator.predicate(
    "guestIdentifier is non-empty string",
    typeof authorizedGuest.guestIdentifier === "string" &&
      authorizedGuest.guestIdentifier.length > 0,
  );
  // Ensure createdAt matches ISO 8601 datetime format
  TestValidator.predicate(
    "createdAt is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      authorizedGuest.createdAt,
    ),
  );
  // updatedAt and deletedAt can be null or ISO date-time string
  TestValidator.predicate(
    "updatedAt is null or ISO date-time",
    authorizedGuest.updatedAt === null ||
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        authorizedGuest.updatedAt,
      ),
  );
  TestValidator.predicate(
    "deletedAt is null or ISO date-time",
    authorizedGuest.deletedAt === null ||
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        authorizedGuest.deletedAt,
      ),
  );
  // Ensure token is present and has required properties as string type
  TestValidator.predicate(
    "token.access is non-empty string",
    typeof authorizedGuest.token.access === "string" &&
      authorizedGuest.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty string",
    typeof authorizedGuest.token.refresh === "string" &&
      authorizedGuest.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      authorizedGuest.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "token.refreshable_until is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      authorizedGuest.token.refreshable_until,
    ),
  );
}
