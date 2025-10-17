import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardGuest";

/**
 * Validates retrieval of a single discussion board guest session by its unique
 * ID.
 *
 * This test authenticates as an admin to access protected admin endpoints. It
 * retrieves guest session details, checks all main properties for correctness,
 * and verifies business rules such as soft deletion field handling.
 *
 * Negative tests include attempting retrieval with a non-existent ID and
 * retrieval without authentication to confirm proper error handling.
 *
 * This ensures that the guest session detail endpoint behaves correctly for
 * management and auditing purposes by administrators.
 */
export async function test_api_discussion_board_admin_discussion_board_guest_retrieval(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "strong-password123";
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.IJoin;

  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Generate a realistic guest session ID (UUID)
  const guestSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Try retrieving guest session details successfully
  const guestSession: IDiscussionBoardDiscussionBoardGuest =
    await api.functional.discussionBoard.admin.discussionBoardGuests.at(
      connection,
      { discussionBoardGuestId: guestSessionId },
    );
  typia.assert(guestSession);

  TestValidator.equals(
    "guest session ID matches",
    guestSession.id,
    guestSessionId,
  );
  TestValidator.predicate(
    "session_token is a string with length > 0",
    typeof guestSession.session_token === "string" &&
      guestSession.session_token.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid ISO date-time string",
    typeof guestSession.created_at === "string" &&
      !isNaN(Date.parse(guestSession.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date-time string",
    typeof guestSession.updated_at === "string" &&
      !isNaN(Date.parse(guestSession.updated_at)),
  );
  TestValidator.predicate(
    "deleted_at is null or valid ISO date-time string",
    guestSession.deleted_at === null ||
      (typeof guestSession.deleted_at === "string" &&
        !isNaN(Date.parse(guestSession.deleted_at))),
  );

  // 4. Negative test: Non-existent guest session ID should cause error
  const fakeGuestSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "retrieving non-existent guest session should fail",
    async () => {
      await api.functional.discussionBoard.admin.discussionBoardGuests.at(
        connection,
        { discussionBoardGuestId: fakeGuestSessionId },
      );
    },
  );

  // 5. Negative test: call without admin authentication
  // Create a new connection without auth headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated retrieval of guest session should fail",
    async () => {
      await api.functional.discussionBoard.admin.discussionBoardGuests.at(
        unauthenticatedConnection,
        { discussionBoardGuestId: guestSessionId },
      );
    },
  );
}
