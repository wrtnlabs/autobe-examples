import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IDiscussionBoardMemberuserRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuserRestriction";

/**
 * Validate that an admin cannot create a restriction for a non-existent member
 * user.
 *
 * ## Business intent
 *
 * This test ensures that the moderation endpoint for creating
 * `discussion_board_memberuser_restrictions` enforces the invariant that a
 * restriction can only be attached to an existing member user account. Even
 * when an administrator is properly authenticated and provides a syntactically
 * valid restriction payload, if the `memberUserId` path parameter does not
 * correspond to any row in `discussion_board_memberusers.id`, the service must
 * reject the request and avoid persisting any restriction row.
 *
 * ## Covered workflow
 *
 * 1. Register a fresh admin user via POST /auth/adminUser/join. This both creates
 *    the admin row in `discussion_board_adminusers` and establishes an
 *    authenticated `adminUser` session, wiring the connection's `Authorization`
 *    header through the SDK.
 * 2. Generate a random UUID value that will be treated as a non-existent member
 *    user identifier in the scope of this test. Because we never create any
 *    discussion_board_memberusers record here, any UUID is effectively invalid
 *    for the target endpoint.
 * 3. Build a syntactically valid `IDiscussionBoardMemberuserRestriction.ICreate`
 *    payload with:
 *
 *    - A non-empty `restriction_level` such as `"full_block"`,
 *    - A non-empty `reason_category` such as `"spam_advertising"`,
 *    - `started_at` set to the current timestamp in ISO 8601 (`date-time`) format,
 *    - And `ended_at` explicitly set to `null` to represent an ongoing restriction.
 * 4. As the authenticated admin user, invoke POST
 *    /discussionBoard/adminUser/memberUsers/{memberUserId}/restriction through
 *    `api.functional.discussionBoard.adminUser.memberUsers.restriction.create`
 *    using the invalid `memberUserId` and the valid body inside
 *    `TestValidator.error`, asserting that the call fails.
 * 5. Because the SDK surface exposed to this test does not provide any listing or
 *    lookup endpoints for restrictions or member users, we interpret the fact
 *    that the create call throws an error (instead of returning a normal
 *    `IDiscussionBoardMemberuserRestriction` object) as evidence that no
 *    restriction row has been created for the bogus identifier.
 *
 * ## What this test validates
 *
 * - Administrative authentication works for the join endpoint and yields a valid
 *   `IDiscussionBoardAdminuser.IAuthorized` object with tokens.
 * - The restriction creation endpoint rejects attempts to create a restriction
 *   for a memberUserId that does not exist in `discussion_board_memberusers`.
 * - The endpoint enforces the business rule that restrictions can only be
 *   attached to existing member users, and that invalid foreign keys result in
 *   an error instead of silent creation.
 */
export async function test_api_admin_create_member_restriction_for_invalid_member(
  connection: api.IConnection,
) {
  // 1. Register a fresh admin user and establish an authenticated admin session.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(1),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare a UUID that does not correspond to any existing member user
  //    within this test scope.
  const nonExistentMemberUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Build a syntactically valid restriction creation payload.
  const restrictionCreateBody = {
    restriction_level: "full_block",
    reason_category: "spam_advertising",
    started_at: new Date().toISOString(),
    ended_at: null,
  } satisfies IDiscussionBoardMemberuserRestriction.ICreate;

  // 4. Attempt to create the restriction and assert that it fails.
  await TestValidator.error(
    "creating restriction for non-existent member should fail",
    async () => {
      await api.functional.discussionBoard.adminUser.memberUsers.restriction.create(
        connection,
        {
          memberUserId: nonExistentMemberUserId,
          body: restrictionCreateBody,
        },
      );
    },
  );
}
