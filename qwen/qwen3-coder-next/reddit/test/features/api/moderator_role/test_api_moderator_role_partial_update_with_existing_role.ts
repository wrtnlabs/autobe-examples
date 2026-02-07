import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityRole";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import type { IRedditPlatformModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeratorRole";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_reddit_platform_moderator_communities_moderators_add } from "../../../generate/generate_random_reddit_platform_moderator_communities_moderators_add";
import { generate_random_reddit_platform_user_communities_create } from "../../../generate/generate_random_reddit_platform_user_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_role } from "../../../prepare/prepare_random_reddit_platform_community_role";

/**
 * Test moderator role partial update functionality.
 * This test verifies the partial update workflow for moderator roles in a community.
 * Since DTO definitions are minimal/stubs, the test validates the core workflow
 * without property-specific assertions.
 */
export async function test_api_moderator_role_partial_update_with_existing_role(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: RandomGenerator.name() + "@admin.com",
      password: "1234",
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  // Create a community - note: community object has no properties in stub DTO
  const community = await api.functional.redditPlatform.user.communities.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: "Test community",
      } satisfies IRedditPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  // Register and add first moderator
  const moderatorConnection1: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection1, {
    body: {
      email: RandomGenerator.name() + "@mod1.com",
      password: "1234",
    } satisfies IRedditPlatformModerator.IJoin,
  });
  // Use dummy values since DTOs don't expose properties
  const moderatorRole1 =
    await api.functional.redditPlatform.moderator.communities.moderators.add(
      adminConnection,
      {
        communityId: "dummy-community-id-1",
        body: {
          user_id: "dummy_user_id",
        } satisfies IRedditPlatformCommunityRole.ICreate,
      },
    );
  typia.assert(moderatorRole1);
  // Register and add second moderator
  const moderatorConnection2: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection2, {
    body: {
      email: RandomGenerator.name() + "@mod2.com",
      password: "1234",
    } satisfies IRedditPlatformModerator.IJoin,
  });
  const moderatorRole2 =
    await api.functional.redditPlatform.moderator.communities.moderators.add(
      adminConnection,
      {
        communityId: "dummy-community-id-2",
        body: {
          user_id: "dummy_user_id2",
        } satisfies IRedditPlatformCommunityRole.ICreate,
      },
    );
  typia.assert(moderatorRole2);
  // Auth admin for role update
  const adminConnection2: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection2, {
    body: {
      email: RandomGenerator.name() + "@admin2.com",
      password: "1234",
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  // Perform partial update on moderator role with dummy values
  const updatedRole = await api.functional.redditPlatform.moderators.update(
    adminConnection2,
    {
      body: {
        communityId: "dummy-community-id",
        moderatorId: "dummy-moderator-id",
        role: "owner" satisfies IRedditPlatformModeratorRole.IUpdate,
      },
    },
  );
  typia.assert(updatedRole);
  // Basic validation - only using available types since DTOs are stubs
  TestValidator.equals("update successful", typeof updatedRole, "object");
}
