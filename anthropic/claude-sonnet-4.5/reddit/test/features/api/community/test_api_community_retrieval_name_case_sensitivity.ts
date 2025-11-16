import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test community name parameter case sensitivity and URL compatibility.
 *
 * This test validates that:
 *
 * 1. Community names are stored in lowercase as per creation constraints
 * 2. The retrieval endpoint uses the exact lowercase name as URL parameter
 * 3. Name matching is consistent with storage format
 * 4. URL structure uses human-readable community names (/r/{communityName}
 *    pattern)
 * 5. The name field serves as stable URL identifier
 *
 * Test workflow:
 *
 * 1. Authenticate as moderator
 * 2. Create community with specific lowercase name
 * 3. Retrieve community using exact lowercase name
 * 4. Validate retrieved community matches created community
 * 5. Verify name consistency and storage format compliance
 */
export async function test_api_community_retrieval_name_case_sensitivity(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "securePassword123",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create community with specific lowercase name
  const communityName = RandomGenerator.alphabets(10);
  const createdCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(createdCommunity);

  // Step 3: Retrieve community using exact lowercase name
  const retrievedCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.communities.at(connection, {
      communityName: communityName,
    });
  typia.assert(retrievedCommunity);

  // Step 4: Validate retrieved community matches created community
  TestValidator.equals(
    "retrieved community ID matches created community",
    retrievedCommunity.id,
    createdCommunity.id,
  );

  TestValidator.equals(
    "retrieved community name matches created community name",
    retrievedCommunity.name,
    createdCommunity.name,
  );

  TestValidator.equals(
    "community name is stored in lowercase format",
    retrievedCommunity.name,
    communityName,
  );

  TestValidator.predicate(
    "community name follows lowercase pattern constraint",
    /^[a-z0-9_]+$/.test(retrievedCommunity.name),
  );

  TestValidator.equals(
    "retrieved community display_title matches",
    retrievedCommunity.display_title,
    createdCommunity.display_title,
  );

  TestValidator.equals(
    "retrieved community description matches",
    retrievedCommunity.description,
    createdCommunity.description,
  );

  TestValidator.equals(
    "retrieved community creator_member_id matches",
    retrievedCommunity.creator_member_id,
    createdCommunity.creator_member_id,
  );
}
