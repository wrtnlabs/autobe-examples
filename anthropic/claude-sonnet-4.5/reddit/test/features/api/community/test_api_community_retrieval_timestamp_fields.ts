import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test that community retrieval includes accurate timestamp fields.
 *
 * This test validates the temporal metadata integrity of community entities by:
 *
 * 1. Authenticating as a moderator
 * 2. Creating a new community
 * 3. Retrieving the community by name
 * 4. Verifying created_at reflects the exact creation time
 * 5. Verifying updated_at is present and initially matches created_at
 * 6. Verifying deleted_at is null for active communities
 * 7. Verifying all timestamps conform to ISO 8601 date-time format
 * 8. Ensuring timestamps support community age calculation and audit trails
 */
export async function test_api_community_retrieval_timestamp_fields(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator to create test community
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Record creation time before creating community
  const beforeCreation = new Date();

  // Step 3: Create a test community
  const createdCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<21> &
              tags.Pattern<"^[a-z0-9_]+$">
          >(),
          display_title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 7,
          }),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
          rules: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(createdCommunity);

  // Step 4: Record time after creation
  const afterCreation = new Date();

  // Step 5: Retrieve the community by name to verify timestamp fields
  const retrievedCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.communities.at(connection, {
      communityName: createdCommunity.name,
    });
  typia.assert(retrievedCommunity);

  // Step 6: Parse and validate created_at timestamp
  const createdAt = new Date(retrievedCommunity.created_at);
  TestValidator.predicate(
    "created_at is a valid date",
    !isNaN(createdAt.getTime()),
  );

  // Step 7: Verify created_at reflects the actual creation time
  TestValidator.predicate(
    "created_at is within expected time range",
    createdAt >= beforeCreation && createdAt <= afterCreation,
  );

  // Step 8: Parse and validate updated_at timestamp
  const updatedAt = new Date(retrievedCommunity.updated_at);
  TestValidator.predicate(
    "updated_at is a valid date",
    !isNaN(updatedAt.getTime()),
  );

  // Step 9: Verify updated_at initially matches created_at for new communities
  TestValidator.equals(
    "updated_at initially matches created_at",
    retrievedCommunity.updated_at,
    retrievedCommunity.created_at,
  );

  // Step 10: Verify deleted_at is null for active communities
  TestValidator.equals(
    "deleted_at is null for active community",
    retrievedCommunity.deleted_at,
    null,
  );

  // Step 11: Verify timestamps support age calculation
  const communityAge = Date.now() - createdAt.getTime();
  TestValidator.predicate(
    "community age can be calculated from timestamp",
    communityAge >= 0 && communityAge < 60000,
  );
}
