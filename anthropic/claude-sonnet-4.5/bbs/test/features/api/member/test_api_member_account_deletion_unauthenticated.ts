import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that account deletion requires authentication.
 *
 * This test verifies that the member account deletion endpoint properly
 * enforces authentication requirements by attempting to delete a member account
 * without providing valid authentication credentials.
 *
 * Steps:
 *
 * 1. Create a member account through registration to obtain a valid memberId
 * 2. Create an unauthenticated connection (empty headers, no JWT token)
 * 3. Attempt to delete the member account using the unauthenticated connection
 * 4. Verify that the operation fails with 401 Unauthorized error
 */
export async function test_api_member_account_deletion_unauthenticated(
  connection: api.IConnection,
) {
  // Step 1: Create a member account to obtain a valid memberId
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const createdMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(createdMember);

  // Step 2: Create an unauthenticated connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 3: Attempt to delete the member account without authentication
  // Step 4: Verify that the operation fails with 401 Unauthorized
  await TestValidator.httpError(
    "unauthenticated deletion should fail with 401",
    401,
    async () => {
      await api.functional.discussionBoard.member.members.erase(
        unauthenticatedConnection,
        {
          memberId: createdMember.id,
        },
      );
    },
  );
}
