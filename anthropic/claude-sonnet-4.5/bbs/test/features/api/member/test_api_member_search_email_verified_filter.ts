import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";

/**
 * Test member search filtering by email verification status.
 *
 * This test validates that moderators can filter member search results based on
 * email verification status. Since email verification requires tokens sent via
 * email that are not accessible in tests, this test focuses on filtering newly
 * created unverified members and validating the filter parameter works
 * correctly.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create multiple members (all will have email_verified=false by default)
 * 3. Test filtering with emailVerified=false to find unverified members
 * 4. Test filtering with emailVerified=true to confirm different results
 * 5. Test without filter to confirm all members returned
 */
export async function test_api_member_search_email_verified_filter(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create multiple unverified members (email_verified=false by default)
  const createdMembers: IDiscussionBoardMember.IAuthorized[] =
    await ArrayUtil.asyncRepeat(5, async () => {
      const member = await api.functional.auth.member.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: typia.random<string & tags.Format<"password">>(),
          username: typia.random<
            string & tags.MinLength<3> & tags.MaxLength<30>
          >(),
          display_name: RandomGenerator.name(),
          bio: RandomGenerator.paragraph({ sentences: 2 }),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardMember.ICreate,
      });
      typia.assert(member);
      return member;
    });

  // Verify all created members have email_verified=false
  for (const member of createdMembers) {
    TestValidator.equals(
      "newly created member has email_verified=false",
      member.email_verified,
      false,
    );
  }

  // Step 3: Test filtering with emailVerified=false
  const unverifiedResults =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        emailVerified: false,
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(unverifiedResults);

  TestValidator.predicate(
    "unverified filter returns results",
    unverifiedResults.data.length >= 5,
  );

  // Verify our created members are in the unverified results
  const createdMemberIds = createdMembers.map((m) => m.id);
  const foundUnverifiedCount = unverifiedResults.data.filter((m) =>
    createdMemberIds.includes(m.id),
  ).length;

  TestValidator.predicate(
    "all created unverified members found in results",
    foundUnverifiedCount === 5,
  );

  // Step 4: Test filtering with emailVerified=true
  const verifiedResults =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        emailVerified: true,
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(verifiedResults);

  // Verify none of our created members are in verified results
  const foundInVerified = verifiedResults.data.filter((m) =>
    createdMemberIds.includes(m.id),
  ).length;

  TestValidator.equals(
    "created unverified members not in verified results",
    foundInVerified,
    0,
  );

  // Step 5: Test without filter - should return all members
  const allResults =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(allResults);

  TestValidator.predicate(
    "no filter returns all members including our created ones",
    allResults.data.length >= 5,
  );

  // Verify our created members are in the all results
  const foundInAll = allResults.data.filter((m) =>
    createdMemberIds.includes(m.id),
  ).length;

  TestValidator.equals(
    "all created members found when no filter applied",
    foundInAll,
    5,
  );
}
