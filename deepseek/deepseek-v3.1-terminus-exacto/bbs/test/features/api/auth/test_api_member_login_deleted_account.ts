import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test member login behavior with account lifecycle considerations.
 *
 * This test originally aimed to validate login attempts to soft-deleted
 * accounts, but since the provided API does not include a delete endpoint, the
 * test focuses on demonstrating that login works for active accounts and
 * documents the limitation in testing the deletion scenario.
 */
export async function test_api_member_login_deleted_account(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestPassword123";
  const currentUrl = "https://example.com/test";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: email,
      username: RandomGenerator.name(1),
      password: password,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: currentUrl,
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Verify that login works for the newly created active account
  const loginResult = await api.functional.auth.member.login(connection, {
    body: {
      email: email,
      password: password,
      href: currentUrl,
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(loginResult);

  TestValidator.equals(
    "login should succeed for active account",
    loginResult.id,
    member.id,
  );

  // Note: The original test scenario requested validation of login attempts to deleted accounts.
  // However, the provided API does not include a delete endpoint to simulate account deletion.
  // In a complete implementation, we would:
  // 1. Call a delete endpoint (if available) to soft-delete the account
  // 2. Attempt login again and validate that it fails with appropriate error
  //
  // Since this functionality is not available through the provided API endpoints,
  // this test demonstrates the successful login flow for active accounts as a baseline.
}
