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
 * Test filtering moderators by role type (owner vs moderator) in a community.
 *
 * Validates the moderator listing functionality with role-based filtering. Tests that the PATCH endpoint correctly filters moderator records by role type, returning only 'owner' or 'moderator' roles as specified. Ensures pagination metadata accurately reflects filtered result counts.
 *
 * The test creates a community with both an owner and a regular moderator, then verifies that filtering by role returns the correct subset of moderators. Special attention is given to validating that role filtering works correctly and that the response structure matches expectations.
 *
 * 1. Authenticate first moderator account (will become owner)
 * 2. Authenticate second moderator account (will become regular moderator)
 * 3. Generate a community ID for testing (using random UUID)
 * 4. Add first moderator as owner to the community
 * 5. Add second moderator as regular moderator to the community
 * 6. Call PATCH endpoint with role='moderator' filter
 * 7. Verify response contains only regular moderator (not owner)
 * 8. Call PATCH endpoint with role='owner' filter
 * 9. Verify response contains only owner record
 * 10. Validate pagination metadata for both queries
 */
export async function test_api_moderator_list_filter_by_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate first moderator (will be owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_moderator_join(ownerConnection, {
    body: {
      display_name: "Owner Moderator",
    },
  });
  typia.assert(ownerAuth);
  // 2. Authenticate second moderator (will be regular moderator)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      display_name: "Regular Moderator",
    },
  });
  typia.assert(moderatorAuth);
  // 3. Generate a community ID for testing
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Add first moderator as owner to the community
  const ownerAssignment =
    await generate_random_reddit_clone_moderator_communities_moderators_create(
      ownerConnection,
      {
        params: { communityId },
        body: {
          userProfileId: ownerAuth.userProfile.id,
          role: "owner",
        },
      },
    );
  typia.assert(ownerAssignment);
  // 5. Add second moderator as regular moderator to the community
  const moderatorAssignment =
    await generate_random_reddit_clone_moderator_communities_moderators_create(
      moderatorConnection,
      {
        params: { communityId },
        body: {
          userProfileId: moderatorAuth.userProfile.id,
          role: "moderator",
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 6. Call PATCH endpoint with role='moderator' filter
  const moderatorFilterResult =
    await api.functional.redditClone.moderator.communities.moderators.index(
      ownerConnection,
      {
        communityId,
        body: {
          role: "moderator",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(moderatorFilterResult);
  // 7. Verify response contains only regular moderator (not owner)
  TestValidator.equals(
    "moderator filter returns correct count",
    moderatorFilterResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "moderator filter returns only moderator role",
    moderatorFilterResult.data[0]?.role,
    "moderator",
  );
  TestValidator.equals(
    "moderator filter returns correct user",
    moderatorFilterResult.data[0]?.userProfile.id,
    moderatorAuth.userProfile.id,
  );
  // 8. Call PATCH endpoint with role='owner' filter
  const ownerFilterResult =
    await api.functional.redditClone.moderator.communities.moderators.index(
      ownerConnection,
      {
        communityId,
        body: {
          role: "owner",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(ownerFilterResult);
  // 9. Verify response contains only owner record
  TestValidator.equals(
    "owner filter returns correct count",
    ownerFilterResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "owner filter returns only owner role",
    ownerFilterResult.data[0]?.role,
    "owner",
  );
  TestValidator.equals(
    "owner filter returns correct user",
    ownerFilterResult.data[0]?.userProfile.id,
    ownerAuth.userProfile.id,
  );
  // 10. Validate pagination metadata for both queries
  TestValidator.equals(
    "moderator filter pagination current page",
    moderatorFilterResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "moderator filter pagination limit",
    moderatorFilterResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "owner filter pagination current page",
    ownerFilterResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "owner filter pagination limit",
    ownerFilterResult.pagination.limit,
    10,
  );
}
