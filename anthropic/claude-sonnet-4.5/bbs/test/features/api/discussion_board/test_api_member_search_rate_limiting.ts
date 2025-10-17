import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";

/**
 * Test that member search enforces rate limiting according to business rules.
 *
 * This test validates that the discussion board platform correctly enforces
 * rate limiting on the member search API endpoint. The platform implements
 * tiered rate limits based on authentication status:
 *
 * - Guest users (unauthenticated): 20 searches per hour
 * - Authenticated members: 100 searches per hour
 *
 * Test workflow:
 *
 * 1. Perform 20 searches as guest user - all should succeed
 * 2. Attempt 21st search as guest - should be rate limited
 * 3. Register and authenticate as a member
 * 4. Perform 100 searches as authenticated member - all should succeed
 * 5. Attempt 101st search as authenticated member - should be rate limited
 *
 * This validates that the rate limiting mechanism correctly identifies user
 * types and enforces appropriate thresholds to prevent abuse of the search
 * functionality while allowing legitimate usage patterns.
 */
export async function test_api_member_search_rate_limiting(
  connection: api.IConnection,
) {
  // Create unauthenticated connection for guest user testing
  const guestConnection: api.IConnection = { ...connection, headers: {} };

  // Step 1: Perform 20 searches as guest user (at the limit)
  await ArrayUtil.asyncRepeat(20, async (index) => {
    const searchResult: IPageIDiscussionBoardMember.ISummary =
      await api.functional.discussionBoard.users.index(guestConnection, {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardMember.IRequest,
      });
    typia.assert(searchResult);
  });

  // Step 2: Attempt 21st search as guest - should be rate limited
  await TestValidator.error(
    "guest user 21st search should be rate limited",
    async () => {
      await api.functional.discussionBoard.users.index(guestConnection, {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardMember.IRequest,
      });
    },
  );

  // Step 3: Register and authenticate as a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!@#";

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Perform 100 searches as authenticated member (at the limit)
  await ArrayUtil.asyncRepeat(100, async (index) => {
    const searchResult: IPageIDiscussionBoardMember.ISummary =
      await api.functional.discussionBoard.users.index(connection, {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardMember.IRequest,
      });
    typia.assert(searchResult);
  });

  // Step 5: Attempt 101st search as authenticated member - should be rate limited
  await TestValidator.error(
    "authenticated member 101st search should be rate limited",
    async () => {
      await api.functional.discussionBoard.users.index(connection, {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardMember.IRequest,
      });
    },
  );
}
