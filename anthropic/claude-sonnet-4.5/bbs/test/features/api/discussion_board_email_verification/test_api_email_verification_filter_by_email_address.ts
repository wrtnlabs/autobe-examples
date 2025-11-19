import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardEmailVerification";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardEmailVerification";

/**
 * Test email verification filtering by email address with partial matching.
 *
 * This test validates that moderators can search email verification records
 * using partial email address matching. The scenario creates multiple
 * verification records with different email addresses and domains, then tests
 * the email filter parameter to ensure it correctly returns only matching
 * records.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Generate email verification records with diverse email patterns
 * 3. Test email filtering with partial matches (domain, username prefix)
 * 4. Validate that only matching records are returned in search results
 */
export async function test_api_email_verification_filter_by_email_address(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePassword123!",
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      href: "https://test.example.com/moderator/join",
      referrer: "https://test.example.com/",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create email verification records with different email patterns
  const testDomain = "testdomain.com";
  const anotherDomain = "otherdomain.com";

  // Create verifications with testdomain.com
  const verificationsWithTestDomain = await ArrayUtil.asyncRepeat(
    3,
    async () => {
      const memberId = typia.random<string & tags.Format<"uuid">>();
      const randomEmail = typia.random<string & tags.Format<"email">>();
      const emailParts = randomEmail.split("@");
      const username = emailParts[0];
      const email = `${username}@${testDomain}`;

      const verification =
        await api.functional.discussionBoard.emailVerifications.create(
          connection,
          {
            body: {
              discussion_board_member_id: memberId,
              email: email,
            } satisfies IDiscussionBoardEmailVerification.ICreate,
          },
        );
      typia.assert(verification);
      return verification;
    },
  );

  // Create verifications with otherdomain.com
  const verificationsWithOtherDomain = await ArrayUtil.asyncRepeat(
    2,
    async () => {
      const memberId = typia.random<string & tags.Format<"uuid">>();
      const randomEmail = typia.random<string & tags.Format<"email">>();
      const emailParts = randomEmail.split("@");
      const username = emailParts[0];
      const email = `${username}@${anotherDomain}`;

      const verification =
        await api.functional.discussionBoard.emailVerifications.create(
          connection,
          {
            body: {
              discussion_board_member_id: memberId,
              email: email,
            } satisfies IDiscussionBoardEmailVerification.ICreate,
          },
        );
      typia.assert(verification);
      return verification;
    },
  );

  // Step 3: Test filtering by domain (testdomain.com)
  const domainFilterResult =
    await api.functional.discussionBoard.moderator.emailVerifications.index(
      connection,
      {
        body: {
          email: testDomain,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardEmailVerification.IRequest,
      },
    );
  typia.assert(domainFilterResult);

  // Step 4: Validate that all returned records match the filter
  TestValidator.predicate(
    "domain filter should return at least the created records",
    domainFilterResult.data.length >= verificationsWithTestDomain.length,
  );

  // All returned records should contain the filtered domain
  domainFilterResult.data.forEach((record) => {
    TestValidator.predicate(
      `email ${record.email} should contain domain ${testDomain}`,
      record.email.includes(testDomain),
    );
  });

  // Step 5: Test filtering by different domain (otherdomain.com)
  const otherDomainFilterResult =
    await api.functional.discussionBoard.moderator.emailVerifications.index(
      connection,
      {
        body: {
          email: anotherDomain,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardEmailVerification.IRequest,
      },
    );
  typia.assert(otherDomainFilterResult);

  TestValidator.predicate(
    "other domain filter should return at least the created records",
    otherDomainFilterResult.data.length >= verificationsWithOtherDomain.length,
  );

  otherDomainFilterResult.data.forEach((record) => {
    TestValidator.predicate(
      `email ${record.email} should contain domain ${anotherDomain}`,
      record.email.includes(anotherDomain),
    );
  });

  // Step 6: Verify that the two domain filters return different results
  const testDomainEmails = domainFilterResult.data.map((r) => r.email);
  const otherDomainEmails = otherDomainFilterResult.data.map((r) => r.email);

  TestValidator.predicate(
    "test domain results should not contain other domain emails",
    !testDomainEmails.some((email) => email.includes(anotherDomain)),
  );

  TestValidator.predicate(
    "other domain results should not contain test domain emails",
    !otherDomainEmails.some((email) => email.includes(testDomain)),
  );
}
