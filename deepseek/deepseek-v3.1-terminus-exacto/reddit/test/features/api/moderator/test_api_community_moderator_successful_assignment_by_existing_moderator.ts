import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_communities_moderators_create } from "../../../generate/generate_random_community_platform_user_communities_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_community_moderator_successful_assignment_by_existing_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create owner user and community
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_user_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    },
  });
  typia.assert(owner);
  const community =
    await api.functional.communityPlatform.user.communities.create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 2: Create first moderator candidate user
  const firstModeratorConnection: api.IConnection = { host: connection.host };
  const firstModerator = await authorize_user_join(firstModeratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    },
  });
  typia.assert(firstModerator);
  // Step 3: Owner adds first moderator
  const firstModeratorAssignment =
    await api.functional.communityPlatform.user.communities.moderators.create(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          user_id: firstModerator.id,
          role_level: "junior_moderator",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(firstModeratorAssignment);
  TestValidator.equals(
    "first moderator user matches",
    firstModeratorAssignment.user.id,
    firstModerator.id,
  );
  TestValidator.equals(
    "first moderator assigned by owner",
    firstModeratorAssignment.assigned_by.id,
    owner.id,
  );
  TestValidator.equals(
    "first moderator community matches",
    firstModeratorAssignment.community.id,
    community.id,
  );
  // Step 4: Create second moderator candidate user
  const secondModeratorConnection: api.IConnection = { host: connection.host };
  const secondModerator = await authorize_user_join(secondModeratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    },
  });
  typia.assert(secondModerator);
  // Step 5: First moderator adds second moderator (key test - existing moderator authorization)
  const secondModeratorAssignment =
    await api.functional.communityPlatform.user.communities.moderators.create(
      firstModeratorConnection,
      {
        communityId: community.id,
        body: {
          user_id: secondModerator.id,
          role_level: "senior_moderator",
          notes: "Assigned by existing moderator",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(secondModeratorAssignment);
  TestValidator.equals(
    "second moderator user matches",
    secondModeratorAssignment.user.id,
    secondModerator.id,
  );
  TestValidator.equals(
    "second moderator assigned by first moderator",
    secondModeratorAssignment.assigned_by.id,
    firstModerator.id,
  );
  TestValidator.equals(
    "second moderator community matches",
    secondModeratorAssignment.community.id,
    community.id,
  );
  TestValidator.notEquals(
    "first and second moderator assignments have different IDs",
    firstModeratorAssignment.id,
    secondModeratorAssignment.id,
  );
  // Step 6: Validate role level differences
  TestValidator.equals(
    "first moderator role level is junior",
    firstModeratorAssignment.role_level,
    "junior_moderator",
  );
  TestValidator.equals(
    "second moderator role level is senior",
    secondModeratorAssignment.role_level,
    "senior_moderator",
  );
  // Step 7: Validate both assignments are active
  TestValidator.predicate(
    "first moderator assignment is active",
    firstModeratorAssignment.is_active,
  );
  TestValidator.predicate(
    "second moderator assignment is active",
    secondModeratorAssignment.is_active,
  );
}
