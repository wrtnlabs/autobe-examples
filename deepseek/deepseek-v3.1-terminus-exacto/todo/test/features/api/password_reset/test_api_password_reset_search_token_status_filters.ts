import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberPasswordReset";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test filtering password reset requests by token status including expired/active and used/unused filters.
 * Verify that the endpoint correctly identifies expired tokens based on expiration timestamps and used tokens based on usage timestamps.
 * Validate that combining multiple filters (email + status) works correctly.
 * Ensure that the response includes accurate token status information for administrative monitoring purposes.
 */
export async function test_api_password_reset_search_token_status_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as a member using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: "test-password-123",
      display_name: "Test Member",
      href: "https://example.com/test",
      referrer: "https://example.com/referrer",
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(member);
  // 2. Test various filter combinations
  // We'll test with page=1, limit=10 as reasonable defaults
  const baseRequest = {
    page: 1 satisfies number & typia.tags.Type<"int32"> & typia.tags.Minimum<1>,
    limit: 10 satisfies number &
      typia.tags.Type<"int32"> &
      typia.tags.Minimum<1> &
      typia.tags.Maximum<100>,
  } satisfies IMultiUserTodoMemberPasswordReset.IRequest;
  // Test 1: Search without filters (baseline)
  const allResults =
    await api.functional.multiUserTodo.member.members.password_resets.index(
      memberConnection,
      {
        body: baseRequest,
      },
    );
  typia.assert(allResults);
  // Verify pagination structure
  TestValidator.predicate(
    "has pagination structure",
    allResults.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(allResults.data));
  // Test 2: Filter by expired tokens (true - find expired tokens)
  const expiredResults =
    await api.functional.multiUserTodo.member.members.password_resets.index(
      memberConnection,
      {
        body: {
          ...baseRequest,
          expired: true,
        } satisfies IMultiUserTodoMemberPasswordReset.IRequest,
      },
    );
  typia.assert(expiredResults);
  // Test 3: Filter by active (non-expired) tokens (false - find active tokens)
  const activeResults =
    await api.functional.multiUserTodo.member.members.password_resets.index(
      memberConnection,
      {
        body: {
          ...baseRequest,
          expired: false,
        } satisfies IMultiUserTodoMemberPasswordReset.IRequest,
      },
    );
  typia.assert(activeResults);
  // Test 4: Filter by used tokens (true - find used tokens)
  const usedResults =
    await api.functional.multiUserTodo.member.members.password_resets.index(
      memberConnection,
      {
        body: {
          ...baseRequest,
          used: true,
        } satisfies IMultiUserTodoMemberPasswordReset.IRequest,
      },
    );
  typia.assert(usedResults);
  // Test 5: Filter by unused tokens (false - find unused tokens)
  const unusedResults =
    await api.functional.multiUserTodo.member.members.password_resets.index(
      memberConnection,
      {
        body: {
          ...baseRequest,
          used: false,
        } satisfies IMultiUserTodoMemberPasswordReset.IRequest,
      },
    );
  typia.assert(unusedResults);
  // Test 6: Combine email filter with status filter
  // Use the member's email for filtering
  const combinedResults =
    await api.functional.multiUserTodo.member.members.password_resets.index(
      memberConnection,
      {
        body: {
          ...baseRequest,
          email: member.email.substring(0, 5), // Use partial email for testing
          expired: false,
          used: false,
        } satisfies IMultiUserTodoMemberPasswordReset.IRequest,
      },
    );
  typia.assert(combinedResults);
  // Test 7: Filter by display name (partial match)
  const nameFilteredResults =
    await api.functional.multiUserTodo.member.members.password_resets.index(
      memberConnection,
      {
        body: {
          ...baseRequest,
          display_name: "Test", // Partial display name for testing
        } satisfies IMultiUserTodoMemberPasswordReset.IRequest,
      },
    );
  typia.assert(nameFilteredResults);
  // Validation: For each filtered result, check the token status information
  // Check expired filter logic: If we filtered for expired tokens, all returned tokens should be expired
  for (const item of expiredResults.data) {
    const now = new Date();
    const expiresAt = new Date(item.expires_at);
    TestValidator.predicate("token is expired", expiresAt < now);
  }
  // Check active filter logic: If we filtered for active tokens, all returned tokens should not be expired
  for (const item of activeResults.data) {
    const now = new Date();
    const expiresAt = new Date(item.expires_at);
    TestValidator.predicate("token is active", expiresAt >= now);
  }
  // Check used filter logic: If we filtered for used tokens, all returned tokens should have used_at not null
  for (const item of usedResults.data) {
    TestValidator.predicate("token is used", item.used_at !== null);
    TestValidator.predicate(
      "used_at is date-time string when not null",
      typeof item.used_at === "string",
    );
  }
  // Check unused filter logic: If we filtered for unused tokens, all returned tokens should have used_at null
  for (const item of unusedResults.data) {
    TestValidator.predicate("token is unused", item.used_at === null);
  }
  // Validate that each result has proper member information
  for (const item of allResults.data) {
    typia.assert(item.member);
    TestValidator.predicate(
      "member has id",
      typeof item.member.id === "string",
    );
    TestValidator.predicate(
      "member has email",
      typeof item.member.email === "string",
    );
    TestValidator.predicate(
      "member has display_name",
      typeof item.member.display_name === "string",
    );
    TestValidator.predicate(
      "member has created_at",
      typeof item.member.created_at === "string",
    );
  }
  // Validate that combined filtering returns results (may be zero)
  TestValidator.predicate(
    "combined filter returns array",
    Array.isArray(combinedResults.data),
  );
  // Note: We cannot validate the email filter works correctly since we don't have control over
  // password reset token creation in this test. The test confirms the API accepts the filters
  // and returns a valid response structure.
}
