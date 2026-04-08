import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityModerator";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_clone_moderator_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_moderator_communities_moderators_create";
import { prepare_random_reddit_clone_community_moderator } from "../../../prepare/prepare_random_reddit_clone_community_moderator";

/**
 * Test the primary success path for listing moderators in a community.
 *
 * Validates the complete flow of moderator listing including moderator registration, community creation, and retrieving the moderator list for that community. Ensures that the response contains proper pagination metadata and that the community owner appears in the moderator list with the correct role.
 *
 * Special attention is given to verifying that the owner's role is correctly set to 'owner' and that all required fields in the moderator summary are present and properly typed.
 *
 * 1. Create a new moderator account with random credentials
 * 2. Create a community (the authenticated moderator becomes the owner)
 * 3. List moderators for the community using the PATCH endpoint
 * 4. Verify pagination metadata is present and valid
 * 5. Verify at least one moderator (the owner) exists in the results
 * 6. Verify the owner's role is 'owner' and all fields are properly structured
 */
export async function test_api_moderator_list_community_moderators(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authResult);
  // 2. Create a community (moderator becomes owner)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Add the moderator as owner of the community using their user profile ID
  await generate_random_reddit_clone_moderator_communities_moderators_create(
    moderatorConnection,
    {
      params: {
        communityId,
      },
      body: {
        userProfileId: authResult.reddit_clone_user_profile_id,
        role: "owner",
      },
    },
  );
  // 3. List moderators for the community
  const result =
    await api.functional.redditClone.moderator.communities.moderators.index(
      moderatorConnection,
      {
        communityId,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(result);
  // 4. Verify pagination metadata
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.equals("limit", result.pagination.limit, 10);
  TestValidator.predicate("has records", result.pagination.records >= 1);
  TestValidator.predicate("has pages", result.pagination.pages >= 1);
  // 5. Verify at least one moderator exists
  TestValidator.predicate("moderator list not empty", result.data.length >= 1);
  // 6. Verify the owner exists in the list with correct role
  const owner = result.data.find((mod) => mod.role === "owner");
  TestValidator.predicate(
    "owner exists in moderator list",
    owner !== undefined,
  );
  if (owner) {
    // Verify owner's fields
    TestValidator.equals("owner role", owner.role, "owner");
    TestValidator.predicate("owner has valid ID", owner.id.length > 0);
    TestValidator.predicate(
      "owner has community",
      owner.community.id.length > 0,
    );
    TestValidator.predicate(
      "owner has user profile",
      owner.userProfile.id.length > 0,
    );
    TestValidator.predicate("owner not deleted", owner.deleted_at === null);
    TestValidator.predicate(
      "owner has created_at",
      owner.created_at.length > 0,
    );
    TestValidator.predicate(
      "owner has updated_at",
      owner.updated_at.length > 0,
    );
  }
}
