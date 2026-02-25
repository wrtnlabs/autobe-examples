import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModerator";
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

export async function test_api_community_moderators_filter_active_status(
  connection: api.IConnection,
): Promise<void> {
  // Create community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_user_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphaNumeric(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(owner);
  // Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create multiple users for moderator assignments
  const moderators = await ArrayUtil.asyncRepeat(3, async (index) => {
    const moderatorConnection: api.IConnection = { host: connection.host };
    const user = await authorize_user_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        username: RandomGenerator.alphaNumeric(8),
      } satisfies ICommunityPlatformUser.IJoin,
    });
    typia.assert(user);
    return user;
  });
  // Create active moderator assignments
  for (const moderator of moderators) {
    const assignment =
      await generate_random_community_platform_user_communities_moderators_create(
        ownerConnection,
        {
          params: { communityId: community.id },
          body: {
            user_id: moderator.id,
            role_level: "moderator",
            notes: "Active moderator assignment",
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    typia.assert(assignment);
  }
  // Test filtering with is_active=true
  const activeResponse =
    await api.functional.communityPlatform.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          is_active: true,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(activeResponse);
  // Test without filter (should return all active moderators)
  const allResponse =
    await api.functional.communityPlatform.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(allResponse);
  // Validate filtering logic - both should return all active moderators
  TestValidator.equals(
    "active filter returns all active moderators",
    activeResponse.data.length,
    moderators.length,
  );
  TestValidator.equals(
    "no filter returns all active moderators",
    allResponse.data.length,
    moderators.length,
  );
  // Validate pagination metadata
  TestValidator.equals(
    "active response pagination records",
    activeResponse.pagination.records,
    moderators.length,
  );
  TestValidator.equals(
    "all response pagination records",
    allResponse.pagination.records,
    moderators.length,
  );
  // Validate moderator summary information
  for (const moderatorSummary of activeResponse.data) {
    TestValidator.predicate(
      "moderator summary has user profile",
      moderatorSummary.user.id !== undefined &&
        moderatorSummary.user.username !== undefined,
    );
    TestValidator.predicate(
      "moderator has active status",
      moderatorSummary.is_active === true,
    );
    TestValidator.predicate(
      "moderator has assignment date",
      moderatorSummary.assigned_at !== undefined,
    );
    TestValidator.predicate(
      "moderator has role level",
      moderatorSummary.role_level !== undefined,
    );
  }
  // Test that is_active=false returns empty since all moderators are active
  const inactiveResponse =
    await api.functional.communityPlatform.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          is_active: false,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(inactiveResponse);
  TestValidator.equals(
    "inactive filter returns empty for active-only moderators",
    inactiveResponse.data.length,
    0,
  );
}
