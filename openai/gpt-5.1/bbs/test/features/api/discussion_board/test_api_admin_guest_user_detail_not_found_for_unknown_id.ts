import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestUser";

/**
 * Validate that admin guest user detail endpoint returns an error when queried
 * with a non-existent guestUserId.
 *
 * Business context:
 *
 * - Only authenticated adminUser actors may access
 *   /discussionBoard/adminUser/guestUsers/{guestUserId}.
 * - When the provided guestUserId does not correspond to any
 *   discussion_board_guestusers.id, the endpoint must not return a guest user
 *   record and must surface an error via the HTTP error handling layer.
 *
 * Scenario steps:
 *
 * 1. Register an adminUser via POST /auth/adminUser/join, which authenticates the
 *    connection and issues JWT tokens.
 * 2. Generate a random UUID to act as a non-existent guestUserId.
 * 3. Call GET /discussionBoard/adminUser/guestUsers/{guestUserId} with that UUID
 *    and verify that an error is thrown using TestValidator.error, ensuring
 *    that no IDiscussionBoardGuestUser object is returned for unknown IDs.
 */
export async function test_api_admin_guest_user_detail_not_found_for_unknown_id(
  connection: api.IConnection,
) {
  // 1. Arrange: create and authenticate an admin user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: null,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Act: generate a random, presumably non-existent guestUserId
  const unknownGuestUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Assert: calling guestUsers.at with unknown ID should result in an error
  await TestValidator.error(
    "unknown guest user id should produce an error",
    async () => {
      await api.functional.discussionBoard.adminUser.guestUsers.at(connection, {
        guestUserId: unknownGuestUserId,
      });
    },
  );
}
