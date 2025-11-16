import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test community creation with only required fields.
 *
 * This test validates that a moderator can successfully create a community by
 * providing only the mandatory fields (name, display_title, description, rules)
 * while omitting the optional icon_url and banner_url fields. The test ensures
 * that:
 *
 * 1. Moderator authentication succeeds and provides valid JWT tokens
 * 2. Community creation succeeds with minimal required data
 * 3. Optional fields (icon_url, banner_url) are null or undefined in the response
 * 4. All auto-generated fields are properly initialized (id, timestamps, counts)
 * 5. The created community has valid structure and type conformance
 *
 * This validates the minimum viable path for community creation without visual
 * branding.
 */
export async function test_api_community_creation_with_minimal_fields(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator to obtain JWT tokens
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "securePassword123!";
  const moderatorNickname = RandomGenerator.name();
  const connectionHref = typia.random<string & tags.Format<"uri">>();
  const connectionReferrer = typia.random<string & tags.Format<"uri">>();

  const authenticatedModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: moderatorNickname,
        href: connectionHref,
        referrer: connectionReferrer,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });

  typia.assert(authenticatedModerator);

  // Verify moderator authentication succeeded with correct data
  TestValidator.equals(
    "moderator email matches",
    authenticatedModerator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator nickname matches",
    authenticatedModerator.nickname,
    moderatorNickname,
  );

  // Step 2: Create community with only required fields (omit icon_url and banner_url)
  const communityName = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<21> &
      tags.Pattern<"^[a-z0-9_]+$">
  >();
  const communityDisplayTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 8,
  });
  const communityDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });
  const communityRules = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 6,
    wordMax: 12,
  });

  const createdCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: communityDisplayTitle,
          description: communityDescription,
          rules: communityRules,
          // Explicitly omit icon_url and banner_url to test minimal creation
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );

  typia.assert(createdCommunity);

  // Step 3: Validate the created community structure and required fields
  TestValidator.equals(
    "community name matches input",
    createdCommunity.name,
    communityName,
  );
  TestValidator.equals(
    "community display title matches input",
    createdCommunity.display_title,
    communityDisplayTitle,
  );
  TestValidator.equals(
    "community description matches input",
    createdCommunity.description,
    communityDescription,
  );
  TestValidator.equals(
    "community rules matches input",
    createdCommunity.rules,
    communityRules,
  );

  // Step 4: Verify optional fields are null or undefined
  TestValidator.predicate(
    "icon_url should be null or undefined when not provided",
    createdCommunity.icon_url === null ||
      createdCommunity.icon_url === undefined,
  );
  TestValidator.predicate(
    "banner_url should be null or undefined when not provided",
    createdCommunity.banner_url === null ||
      createdCommunity.banner_url === undefined,
  );

  // Step 5: Verify auto-generated fields are properly initialized
  TestValidator.equals(
    "subscriber_count should be initialized to 0",
    createdCommunity.subscriber_count,
    0,
  );
  TestValidator.equals(
    "post_count should be initialized to 0",
    createdCommunity.post_count,
    0,
  );
  TestValidator.predicate(
    "deleted_at should be null or undefined for active community",
    createdCommunity.deleted_at === null ||
      createdCommunity.deleted_at === undefined,
  );
}
