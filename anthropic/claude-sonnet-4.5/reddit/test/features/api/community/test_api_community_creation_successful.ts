import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test successful community creation by an authenticated moderator.
 *
 * This test validates the complete workflow of creating a new community with
 * all required fields (name, display_title, description, rules) and optional
 * branding fields (icon_url, banner_url). It verifies that:
 *
 * 1. A moderator can successfully authenticate and receive JWT tokens
 * 2. The authenticated moderator can create a community with valid data following
 *    naming conventions
 * 3. The response contains the complete community entity with auto-generated
 *    fields
 * 4. The creator_member_id matches the authenticated moderator's ID
 * 5. The community name is unique and follows URL-compatible format (3-21
 *    lowercase alphanumeric + underscores)
 * 6. The display_title can contain mixed case and spaces up to 100 characters
 * 7. The description accurately reflects the community purpose within 500
 *    characters
 * 8. Community rules are properly stored within 500 characters
 * 9. Optional icon_url and banner_url are valid URIs when provided
 * 10. The created community becomes immediately discoverable with proper
 *     initialization
 */
export async function test_api_community_creation_successful(
  connection: api.IConnection,
) {
  // Step 1: Moderator joins the platform (authentication)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderatorNickname = RandomGenerator.name();

  const joinResponse: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: moderatorNickname,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(joinResponse);

  // Verify authentication tokens are received
  TestValidator.predicate(
    "moderator authentication should succeed",
    joinResponse.token !== null && joinResponse.token !== undefined,
  );
  TestValidator.predicate(
    "access token should be present",
    joinResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be present",
    joinResponse.token.refresh.length > 0,
  );

  // Store moderator ID for later validation
  const moderatorId = joinResponse.id;

  // Step 2: Create community with complete data
  const nameLength = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<21>
  >();
  const communityName = RandomGenerator.alphaNumeric(nameLength);

  const displayTitleRaw = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 2,
    wordMax: 5,
  });
  const displayTitle =
    displayTitleRaw.length > 100
      ? displayTitleRaw.substring(0, 100)
      : displayTitleRaw;

  const descriptionRaw = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 3,
    wordMax: 8,
  });
  const description =
    descriptionRaw.length > 500
      ? descriptionRaw.substring(0, 500)
      : descriptionRaw;

  const rulesRaw = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 3,
    wordMax: 7,
  });
  const rules = rulesRaw.length > 500 ? rulesRaw.substring(0, 500) : rulesRaw;

  const iconUrl = typia.random<string & tags.Format<"uri">>();
  const bannerUrl = typia.random<string & tags.Format<"uri">>();

  const createdCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: displayTitle,
          description: description,
          rules: rules,
          icon_url: iconUrl,
          banner_url: bannerUrl,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(createdCommunity);

  // Step 3: Validate response contains all expected fields
  TestValidator.predicate(
    "community ID should be valid UUID",
    createdCommunity.id.length > 0,
  );

  TestValidator.equals(
    "creator member ID should match authenticated moderator",
    createdCommunity.creator_member_id,
    moderatorId,
  );

  TestValidator.equals(
    "community name should match input",
    createdCommunity.name,
    communityName,
  );

  TestValidator.equals(
    "display title should match input",
    createdCommunity.display_title,
    displayTitle,
  );

  TestValidator.equals(
    "description should match input",
    createdCommunity.description,
    description,
  );

  TestValidator.equals(
    "rules should match input",
    createdCommunity.rules,
    rules,
  );

  TestValidator.equals(
    "icon URL should match input",
    createdCommunity.icon_url,
    iconUrl,
  );

  TestValidator.equals(
    "banner URL should match input",
    createdCommunity.banner_url,
    bannerUrl,
  );

  TestValidator.equals(
    "subscriber count should be initialized to 0",
    createdCommunity.subscriber_count,
    0,
  );

  TestValidator.equals(
    "post count should be initialized to 0",
    createdCommunity.post_count,
    0,
  );

  TestValidator.predicate(
    "created_at should be valid ISO date-time",
    createdCommunity.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at should be valid ISO date-time",
    createdCommunity.updated_at.length > 0,
  );

  TestValidator.predicate(
    "deleted_at should be null for active community",
    createdCommunity.deleted_at === null ||
      createdCommunity.deleted_at === undefined,
  );
}
