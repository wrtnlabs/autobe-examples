import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";

/**
 * Verify that duplicate administrator registrations with the same email are
 * rejected while unique emails succeed.
 *
 * Business context:
 *
 * - /auth/adminUser/join creates a new row in discussion_board_adminusers and
 *   issues initial JWT tokens for the adminUser actor.
 * - Email is a unique login identifier and must satisfy the unique index on
 *   discussion_board_adminusers.email.
 *
 * Scenario:
 *
 * 1. Perform a first successful admin join with a fresh email, asserting the
 *    IDiscussionBoardAdminuser.IAuthorized response.
 * 2. Immediately attempt a second join using the same email but otherwise valid
 *    IDiscussionBoardAdminUserJoin.IRequest data, and assert that the call
 *    fails (business uniqueness violation) using TestValidator.error.
 * 3. Finally, attempt a third join with a different unique email to confirm that
 *    registration still works when the email is not duplicated.
 */
export async function test_api_admin_user_join_duplicate_email_rejected(
  connection: api.IConnection,
) {
  // 1. First successful admin registration with a unique email
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const firstRequest = {
    email,
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const firstJoin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: firstRequest,
    });
  typia.assert<IDiscussionBoardAdminuser.IAuthorized>(firstJoin);

  // 2. Second registration attempt with the same email must be rejected
  const secondRequest = {
    email, // same email to hit unique constraint
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph(),
    ip: null,
    href: firstRequest.href,
    referrer: firstRequest.referrer,
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  await TestValidator.error(
    "duplicate admin email must be rejected",
    async () => {
      await api.functional.auth.adminUser.join(connection, {
        body: secondRequest,
      });
    },
  );

  // 3. Third registration with a different unique email should still succeed
  const anotherEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const thirdRequest = {
    email: anotherEmail,
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph(),
    ip: null,
    href: firstRequest.href,
    referrer: firstRequest.referrer,
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const thirdJoin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: thirdRequest,
    });
  typia.assert<IDiscussionBoardAdminuser.IAuthorized>(thirdJoin);
}
