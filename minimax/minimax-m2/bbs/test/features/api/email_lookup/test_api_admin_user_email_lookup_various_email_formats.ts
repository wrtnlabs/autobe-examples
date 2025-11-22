import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionRegisteredMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionRegisteredMember";
import type { IEconPoliticalDiscussionSystemAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionSystemAdministrator";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_admin_user_email_lookup_various_email_formats(
  connection: api.IConnection,
) {
  // Setup: Create system administrator account for email lookup testing
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalDiscussionSystemAdministrator.IAuthorized =
    await api.functional.auth.systemAdministrator.join.create(connection, {
      body: {
        display_name: RandomGenerator.name(),
        email: adminEmail,
        status: "active",
      } satisfies IEconPoliticalDiscussionUser.ICreate,
    });
  typia.assert(admin);

  // Setup: Create test users with various email formats for lookup validation
  const testEmails = [
    "user@example.com",
    "USER@EXAMPLE.COM",
    "User.Example@Example.COM",
    "user123@test-domain.org",
    "U.S.E.R@DOMAIN.COM",
    "test.email+tag@provider.net",
    "mixedCASE_EMAIL@Domain.Co.KR",
  ];

  const testUsers = await Promise.all(
    testEmails.map(async (email) => {
      const user: IEconPoliticalDiscussionRegisteredMember.IAuthorized =
        await api.functional.auth.registeredMember.join(connection, {
          body: {
            display_name: RandomGenerator.name(),
            email: email,
            status: "active",
          } satisfies IEconPoliticalDiscussionRegisteredMember.ICreate,
        });
      typia.assert(user);
      return user;
    }),
  );

  // Test 1: Exact email lookups (baseline validation)
  await Promise.all(
    testEmails.map(async (email) => {
      const lookupResult =
        await api.functional.econPoliticalDiscussion.systemAdministrator.users.email.at(
          connection,
          { email: email },
        );
      typia.assert(lookupResult);
      TestValidator.equals(
        "exact email lookup matches",
        lookupResult.email,
        email,
      );
    }),
  );

  // Test 2: Case-insensitive email lookups
  const caseVariations = [
    {
      original: "user@example.com",
      variations: ["USER@EXAMPLE.COM", "User@Example.Com", "USER@EXAMPLE.com"],
    },
    {
      original: "user123@test-domain.org",
      variations: ["USER123@TEST-DOMAIN.ORG", "User123@Test-Domain.Org"],
    },
    {
      original: "mixedCASE_EMAIL@Domain.Co.KR",
      variations: [
        "MIXEDCASE_EMAIL@DOMAIN.CO.KR",
        "mixedcase_email@domain.co.kr",
      ],
    },
  ];

  for (const { original, variations } of caseVariations) {
    for (const variation of variations) {
      const lookupResult =
        await api.functional.econPoliticalDiscussion.systemAdministrator.users.email.at(
          connection,
          { email: variation },
        );
      typia.assert(lookupResult);
      TestValidator.equals(
        "case-insensitive email lookup returns original",
        lookupResult.email,
        original,
      );
    }
  }

  // Test 3: Special character handling in email lookups
  const specialCharTests = [
    "User.Example@Example.COM",
    "user123@test-domain.org",
    "test.email+tag@provider.net",
    "U.S.E.R@DOMAIN.COM",
  ];

  for (const email of specialCharTests) {
    const lookupResult =
      await api.functional.econPoliticalDiscussion.systemAdministrator.users.email.at(
        connection,
        { email: email },
      );
    typia.assert(lookupResult);
    TestValidator.equals(
      "special character email lookup preserved format",
      lookupResult.email,
      email,
    );
  }

  // Test 4: Lookup consistency verification
  const repeatedLookups = [
    "user@example.com",
    "USER@EXAMPLE.COM",
    "user123@test-domain.org",
  ];

  for (const email of repeatedLookups) {
    const lookup1 =
      await api.functional.econPoliticalDiscussion.systemAdministrator.users.email.at(
        connection,
        { email: email },
      );
    typia.assert(lookup1);

    const lookup2 =
      await api.functional.econPoliticalDiscussion.systemAdministrator.users.email.at(
        connection,
        { email: email },
      );
    typia.assert(lookup2);

    TestValidator.equals(
      "repeated email lookups return consistent results",
      lookup1.id,
      lookup2.id,
    );
    TestValidator.equals(
      "email format preserved in repeated lookups",
      lookup1.email,
      lookup2.email,
    );
  }

  // Test 5: Non-existent email lookup error handling
  const nonExistentEmails = [
    "nonexistent@example.com",
    "INVALID@NONEXISTENT.ORG",
    "missing@domain.test",
  ];

  for (const email of nonExistentEmails) {
    await TestValidator.error(
      "non-existent email lookup should fail",
      async () => {
        await api.functional.econPoliticalDiscussion.systemAdministrator.users.email.at(
          connection,
          { email: email },
        );
      },
    );
  }

  // Test 6: Email format validation
  const invalidEmails = [
    "invalid-email",
    "@domain.com",
    "user@",
    "user domain.com",
    "",
  ];

  for (const email of invalidEmails) {
    await TestValidator.error(
      "invalid email format should be rejected",
      async () => {
        await api.functional.econPoliticalDiscussion.systemAdministrator.users.email.at(
          connection,
          { email: email },
        );
      },
    );
  }

  // Test 7: Verify user data integrity across all lookups
  const userDataChecks = await Promise.all(
    testUsers.map(async (user) => {
      const lookupResult =
        await api.functional.econPoliticalDiscussion.systemAdministrator.users.email.at(
          connection,
          { email: user.email },
        );
      typia.assert(lookupResult);

      return {
        original: user,
        lookup: lookupResult,
      };
    }),
  );

  for (const { original, lookup } of userDataChecks) {
    TestValidator.equals(
      "user ID matches between original and lookup",
      lookup.id,
      original.id,
    );
    TestValidator.equals(
      "display name preserved in lookup",
      lookup.display_name,
      original.display_name,
    );
    TestValidator.equals(
      "email format consistency maintained",
      lookup.email,
      original.email,
    );
    TestValidator.equals(
      "user status preserved in lookup",
      lookup.status,
      original.status,
    );
  }
}
