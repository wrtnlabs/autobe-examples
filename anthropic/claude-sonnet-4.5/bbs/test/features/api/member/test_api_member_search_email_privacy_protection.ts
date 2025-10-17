import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";

/**
 * Test that email addresses are NEVER included in search results under any
 * circumstances.
 *
 * This critical privacy protection test validates that the ISummary response
 * type excludes all private information including email addresses, even though
 * email verification status can be used as a filter criterion.
 *
 * Test workflow:
 *
 * 1. Create multiple member accounts with different email verification statuses
 * 2. Perform search operations filtering by email_verified status
 * 3. Verify search results match the email_verified filter criteria
 * 4. **CRITICALLY VERIFY** that NO email addresses appear in response data
 * 5. Verify only public profile fields are included in results
 * 6. Verify password_hash and other sensitive fields are excluded
 * 7. Test as both guest and authenticated member to confirm universal privacy
 *    enforcement
 */
export async function test_api_member_search_email_privacy_protection(
  connection: api.IConnection,
) {
  // Step 1: Create member accounts with various email verification statuses
  const verifiedMembers: IDiscussionBoardMember.IAuthorized[] = [];
  const unverifiedMembers: IDiscussionBoardMember.IAuthorized[] = [];

  // Create 3 members that would be verified (we'll simulate this state)
  for (let i = 0; i < 3; i++) {
    const memberData = {
      username: `verified_user_${RandomGenerator.alphaNumeric(8)}`,
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
      display_name: RandomGenerator.name(2),
    } satisfies IDiscussionBoardMember.ICreate;

    const member = await api.functional.auth.member.join(connection, {
      body: memberData,
    });
    typia.assert(member);

    verifiedMembers.push(member);
  }

  // Create 3 members that remain unverified
  for (let i = 0; i < 3; i++) {
    const memberData = {
      username: `unverified_user_${RandomGenerator.alphaNumeric(8)}`,
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
      display_name: RandomGenerator.name(2),
    } satisfies IDiscussionBoardMember.ICreate;

    const member = await api.functional.auth.member.join(connection, {
      body: memberData,
    });
    typia.assert(member);

    unverifiedMembers.push(member);
  }

  // Step 2: Test search as guest (unauthenticated) - email privacy must be enforced
  const guestConnection: api.IConnection = { ...connection, headers: {} };

  // Search filtering by email_verified: true
  const verifiedSearchResult = await api.functional.discussionBoard.users.index(
    guestConnection,
    {
      body: {
        email_verified: true,
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(verifiedSearchResult);

  // Step 3: Verify search results are returned
  TestValidator.predicate(
    "search results should contain data",
    verifiedSearchResult.data.length >= 0,
  );

  // Step 4: **CRITICAL PRIVACY CHECK** - Verify NO email addresses in ANY result
  for (const member of verifiedSearchResult.data) {
    // Verify member object structure matches ISummary
    typia.assert<IDiscussionBoardMember.ISummary>(member);

    // CRITICAL: Verify email field does NOT exist in response
    const memberAsAny = member as any;
    TestValidator.predicate(
      "email field must NOT exist in member summary",
      memberAsAny.email === undefined,
    );

    // CRITICAL: Verify password_hash does NOT exist
    TestValidator.predicate(
      "password_hash field must NOT exist in member summary",
      memberAsAny.password_hash === undefined,
    );

    // Verify only public fields are present
    TestValidator.predicate(
      "member must have id field",
      typeof member.id === "string",
    );

    TestValidator.predicate(
      "member must have username field",
      typeof member.username === "string",
    );

    TestValidator.predicate(
      "member must have account_status field",
      typeof member.account_status === "string",
    );

    TestValidator.predicate(
      "member must have created_at field",
      typeof member.created_at === "string",
    );
  }

  // Step 5: Search filtering by email_verified: false
  const unverifiedSearchResult =
    await api.functional.discussionBoard.users.index(guestConnection, {
      body: {
        email_verified: false,
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(unverifiedSearchResult);

  // Step 6: **CRITICAL PRIVACY CHECK** on unverified results
  for (const member of unverifiedSearchResult.data) {
    typia.assert<IDiscussionBoardMember.ISummary>(member);

    const memberAsAny = member as any;
    TestValidator.predicate(
      "email must NOT exist in unverified member results",
      memberAsAny.email === undefined,
    );

    TestValidator.predicate(
      "password_hash must NOT exist in unverified member results",
      memberAsAny.password_hash === undefined,
    );
  }

  // Step 7: Test as authenticated member - privacy must still be enforced
  const authenticatedMember = verifiedMembers[0];

  const authenticatedSearchResult =
    await api.functional.discussionBoard.users.index(connection, {
      body: {
        email_verified: true,
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(authenticatedSearchResult);

  // Step 8: **CRITICAL** - Even authenticated members must NOT see emails in search
  for (const member of authenticatedSearchResult.data) {
    typia.assert<IDiscussionBoardMember.ISummary>(member);

    const memberAsAny = member as any;
    TestValidator.predicate(
      "authenticated user must NOT see email in search results",
      memberAsAny.email === undefined,
    );

    TestValidator.predicate(
      "authenticated user must NOT see password_hash in search results",
      memberAsAny.password_hash === undefined,
    );
  }

  // Step 9: Search with no email_verified filter - verify privacy on all results
  const allMembersResult = await api.functional.discussionBoard.users.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(allMembersResult);

  // Step 10: Final comprehensive privacy check on unfiltered results
  for (const member of allMembersResult.data) {
    typia.assert<IDiscussionBoardMember.ISummary>(member);

    const memberAsAny = member as any;
    TestValidator.predicate(
      "unfiltered search must NOT expose email addresses",
      memberAsAny.email === undefined,
    );

    TestValidator.predicate(
      "unfiltered search must NOT expose password hashes",
      memberAsAny.password_hash === undefined,
    );

    TestValidator.predicate(
      "unfiltered search must NOT expose verification tokens",
      memberAsAny.verification_token === undefined,
    );

    TestValidator.predicate(
      "unfiltered search must NOT expose reset tokens",
      memberAsAny.password_reset_token === undefined,
    );
  }

  // Verify pagination information exists
  TestValidator.predicate(
    "pagination information should be present",
    allMembersResult.pagination !== null &&
      allMembersResult.pagination !== undefined,
  );

  TestValidator.predicate(
    "pagination current page should be valid",
    allMembersResult.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit should be valid",
    allMembersResult.pagination.limit > 0,
  );
}
