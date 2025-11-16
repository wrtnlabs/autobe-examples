import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";

/**
 * Verify idempotent-like delete semantics for missing member user restriction.
 *
 * Business goal: When an admin user attempts to delete (lift) a restriction for
 * a member user that does not currently have a restriction row in
 * `discussion_board_memberuser_restrictions`, the backend must respond with an
 * error instead of succeeding silently, and it must not create or modify any
 * restriction records as a side effect.
 *
 * Available APIs:
 *
 * - POST /auth/adminUser/join -> api.functional.auth.adminUser.join -> body:
 *   IDiscussionBoardAdminUserJoin.IRequest -> response:
 *   IDiscussionBoardAdminuser.IAuthorized (sets Authorization header)
 * - DELETE /discussionBoard/adminUser/memberUsers/{memberUserId}/restriction ->
 *   api.functional.discussionBoard.adminUser.memberUsers.restriction.erase ->
 *   props: { memberUserId: string & tags.Format<"uuid"> } -> response: void |
 *   HttpError
 *
 * Constraints and limitations:
 *
 * - We do not have any API to create or read member users or their restrictions,
 *   so we cannot deterministically ensure the chosen memberUserId belongs to an
 *   existing or non-existing restriction record. Instead, we rely on a freshly
 *   generated random UUID as a highly likely non-existent memberUserId, which
 *   is acceptable for this test harness.
 * - We cannot verify via GET that no restriction row was created as a side effect
 *   of the failed DELETE because no such read/search API is available in the
 *   provided SDK. Therefore, we restrict our validation to ensuring that
 *   attempting to erase a restriction for this memberUserId results in an
 *   error, not a successful void response.
 * - We must not manipulate `connection.headers` directly in the test. All
 *   authentication header handling is done internally by the SDK implementation
 *   of `auth.adminUser.join`.
 * - We must not assert on specific HTTP status codes; instead, we only assert
 *   that some error is thrown. Status-specific testing using TestValidator
 *   helpers like httpError or manual HttpError inspection is prohibited.
 *
 * Test steps:
 *
 * 1. Register and authenticate a discussion board admin user using
 *    `api.functional.auth.adminUser.join`, providing a valid
 *    IDiscussionBoardAdminUserJoin.IRequest body.
 *
 *    - Use typia.random to generate structurally valid values, but we can override
 *         email/href/referrer with RandomGenerator / manual strings where
 *         convenient as long as they satisfy the Format tags.
 *    - After this call, the SDK will automatically store the access token in
 *         `connection.headers.Authorization`, so subsequent calls are
 *         authorized as this admin user.
 * 2. Generate a random memberUserId using `typia.random<string &
 *    tags.Format<"uuid">>()`. This UUID is extremely unlikely to match any
 *    existing member user restriction record, approximating the "no
 *    restriction" case required by the scenario.
 * 3. Call `api.functional.discussionBoard.adminUser.memberUsers.restriction.erase`
 *    with the authenticated connection and the random memberUserId.
 * 4. Use `await TestValidator.error("delete restriction on missing record must
 *    fail", async () => { ... })` to assert that the erase call throws an error
 *    (most likely an HttpError signaling not-found or similar). We do not
 *    attempt to inspect the error type or status code, only that an error
 *    occurs.
 * 5. Because we have no read or listing API for restrictions, we cannot validate
 *    that no record was created as a side effect. However, by design erase
 *    performs a hard delete, and in the missing-row case it should not succeed.
 *    Therefore, verifying that an error occurs for a random memberUserId is
 *    sufficient to confirm that the backend does not treat a missing record as
 *    a silent success.
 */
export async function test_api_admin_member_user_restriction_delete_idempotency_for_missing_record(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const admin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Prepare a random memberUserId that almost certainly has no restriction
  const memberUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3-4. Attempt to delete restriction for the non-existent member user
  await TestValidator.error(
    "delete restriction on missing member user must fail",
    async () => {
      await api.functional.discussionBoard.adminUser.memberUsers.restriction.erase(
        connection,
        {
          memberUserId,
        },
      );
    },
  );
}
