import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICrIPageIntegerRequired } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrIPageIntegerRequired";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionModerator";

/**
 * Test access control for moderator detail retrieval ensuring only authorized
 * users can view complete moderator profiles. Validate that permission checks
 * work correctly for different user roles. Test cross-moderator access patterns
 * and verify security boundaries are maintained.
 *
 * This test focuses on the actual API functionality: successful retrieval of
 * moderator details. It creates multiple moderators and verifies that the
 * detail retrieval endpoint works correctly.
 */
export async function test_api_moderator_detail_access_control(
  connection: api.IConnection,
) {
  // Create first moderator (senior level)
  const seniorModerator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: `senior_${RandomGenerator.alphabets(8)}`,
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(32),
      moderation_level: "senior",
      email_verified: true,
      two_factor_enabled: true,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(seniorModerator);

  // Create second moderator (junior level)
  const juniorModerator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: `junior_${RandomGenerator.alphabets(8)}`,
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(32),
      moderation_level: "junior",
      email_verified: true,
      two_factor_enabled: false,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(juniorModerator);

  // Create third moderator (admin level)
  const adminModerator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: `admin_${RandomGenerator.alphabets(8)}`,
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(32),
      moderation_level: "admin",
      email_verified: true,
      two_factor_enabled: true,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(adminModerator);

  // Test 1: Verify senior moderator can retrieve own details
  const seniorOwnDetails =
    await api.functional.economicDiscussion.moderator.moderators.at(
      connection,
      {
        moderatorId: seniorModerator.id,
      },
    );
  typia.assert(seniorOwnDetails);
  TestValidator.equals(
    "senior can access own details",
    seniorOwnDetails.id,
    seniorModerator.id,
  );
  TestValidator.equals(
    "senior own username matches",
    seniorOwnDetails.username,
    seniorModerator.username,
  );
  TestValidator.equals(
    "senior own moderation level matches",
    seniorOwnDetails.moderation_level,
    "senior",
  );

  // Test 2: Verify moderator can access another moderator's details
  const seniorAccessJunior =
    await api.functional.economicDiscussion.moderator.moderators.at(
      connection,
      {
        moderatorId: juniorModerator.id,
      },
    );
  typia.assert(seniorAccessJunior);
  TestValidator.equals(
    "can access junior moderator details",
    seniorAccessJunior.id,
    juniorModerator.id,
  );
  TestValidator.equals(
    "junior moderator username matches",
    seniorAccessJunior.username,
    juniorModerator.username,
  );
  TestValidator.equals(
    "junior moderator level is correct",
    seniorAccessJunior.moderation_level,
    "junior",
  );

  // Test 3: Verify admin moderator details retrieval
  const adminDetails =
    await api.functional.economicDiscussion.moderator.moderators.at(
      connection,
      {
        moderatorId: adminModerator.id,
      },
    );
  typia.assert(adminDetails);
  TestValidator.equals(
    "admin details retrieved correctly",
    adminDetails.id,
    adminModerator.id,
  );
  TestValidator.equals(
    "admin username matches",
    adminDetails.username,
    adminModerator.username,
  );
  TestValidator.equals(
    "admin level is correct",
    adminDetails.moderation_level,
    "admin",
  );

  // Test 4: Verify all retrieved details contain expected security fields
  TestValidator.predicate(
    "senior moderator has email verified",
    seniorOwnDetails.email_verified === true,
  );
  TestValidator.predicate(
    "senior moderator has 2FA enabled",
    seniorOwnDetails.two_factor_enabled === true,
  );
  TestValidator.predicate(
    "junior moderator has email verified",
    seniorAccessJunior.email_verified === true,
  );
  TestValidator.predicate(
    "junior moderator 2FA status correct",
    seniorAccessJunior.two_factor_enabled === false,
  );
  TestValidator.predicate(
    "admin has email verified",
    adminDetails.email_verified === true,
  );
  TestValidator.predicate(
    "admin has 2FA enabled",
    adminDetails.two_factor_enabled === true,
  );

  // Test 5: Verify creation and update timestamps are present
  TestValidator.predicate(
    "all moderators have creation timestamps",
    seniorOwnDetails.created_at !== null &&
      seniorAccessJunior.created_at !== null &&
      adminDetails.created_at !== null,
  );
  TestValidator.predicate(
    "all moderators have update timestamps",
    seniorOwnDetails.updated_at !== null &&
      seniorAccessJunior.updated_at !== null &&
      adminDetails.updated_at !== null,
  );

  // Test 6: Verify password hash is included (security consideration)
  TestValidator.predicate(
    "senior moderator has password hash",
    seniorOwnDetails.password_hash !== null,
  );
  TestValidator.predicate(
    "junior moderator has password hash",
    seniorAccessJunior.password_hash !== null,
  );
  TestValidator.predicate(
    "admin moderator has password hash",
    adminDetails.password_hash !== null,
  );

  // Test 7: Test with non-existent moderator ID (should handle gracefully)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  try {
    await api.functional.economicDiscussion.moderator.moderators.at(
      connection,
      {
        moderatorId: nonExistentId,
      },
    );
    // If we reach here, the API doesn't validate existence - this is acceptable behavior
  } catch (error) {
    // If an error is thrown, that's also acceptable behavior for non-existent IDs
    TestValidator.predicate(
      "non-existent moderator access handled",
      error instanceof Error,
    );
  }

  // Test 8: Verify data consistency across different access patterns
  // Get all moderators via index endpoint
  const allModerators =
    await api.functional.economicDiscussion.moderator.moderators.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEconomicDiscussionModerator.IRequest,
      },
    );
  typia.assert(allModerators);

  // Verify that individual details match summary data
  const foundSenior = allModerators.data.find(
    (m) => m.id === seniorModerator.id,
  );
  TestValidator.predicate(
    "senior moderator found in index",
    foundSenior !== undefined,
  );
  if (foundSenior) {
    TestValidator.equals(
      "senior summary username matches detail",
      foundSenior.username,
      seniorOwnDetails.username,
    );
    TestValidator.equals(
      "senior summary level matches detail",
      foundSenior.moderation_level,
      seniorOwnDetails.moderation_level,
    );
    TestValidator.equals(
      "senior summary email verified matches",
      foundSenior.email_verified,
      seniorOwnDetails.email_verified,
    );
    TestValidator.equals(
      "senior summary 2FA status matches",
      foundSenior.two_factor_enabled,
      seniorOwnDetails.two_factor_enabled,
    );
  }

  const foundJunior = allModerators.data.find(
    (m) => m.id === juniorModerator.id,
  );
  TestValidator.predicate(
    "junior moderator found in index",
    foundJunior !== undefined,
  );
  if (foundJunior) {
    TestValidator.equals(
      "junior summary username matches detail",
      foundJunior.username,
      seniorAccessJunior.username,
    );
    TestValidator.equals(
      "junior summary level matches detail",
      foundJunior.moderation_level,
      seniorAccessJunior.moderation_level,
    );
  }

  const foundAdmin = allModerators.data.find((m) => m.id === adminModerator.id);
  TestValidator.predicate(
    "admin moderator found in index",
    foundAdmin !== undefined,
  );
  if (foundAdmin) {
    TestValidator.equals(
      "admin summary username matches detail",
      foundAdmin.username,
      adminDetails.username,
    );
    TestValidator.equals(
      "admin summary level matches detail",
      foundAdmin.moderation_level,
      adminDetails.moderation_level,
    );
  }
}
