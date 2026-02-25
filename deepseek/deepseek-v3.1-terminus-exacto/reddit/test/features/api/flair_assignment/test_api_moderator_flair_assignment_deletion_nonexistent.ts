import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_communities_moderators_create } from "../../../generate/generate_random_community_platform_user_communities_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_moderator_flair_assignment_deletion_nonexistent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup moderator authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await api.functional.communityPlatform.auth.moderator.join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.alphabets(12),
        display_name: RandomGenerator.name(),
        href: "https://test.com",
        referrer: "https://test.com",
      } satisfies ICommunityPlatformModerator.IJoin,
    },
  );
  typia.assert(moderator);
  moderatorConnection.headers = { Authorization: moderator.token.access };
  // 2. Create a user who will own the community
  const userConnection: api.IConnection = { host: connection.host };
  const user = await api.functional.communityPlatform.auth.user.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.alphabets(10),
      } satisfies ICommunityPlatformUser.IJoin,
    },
  );
  typia.assert(user);
  userConnection.headers = { Authorization: user.token.access };
  // 3. Create a community
  const community =
    await api.functional.communityPlatform.user.communities.create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Assign the moderator role to the authenticated moderator
  const moderatorAssignment =
    await api.functional.communityPlatform.user.communities.moderators.create(
      userConnection,
      {
        communityId: community.id,
        body: {
          user_id: moderator.id,
          role_level: "moderator",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Test 1: Delete non-existent assignment ID
  await TestValidator.error(
    "should reject non-existent assignment ID",
    async () => {
      await api.functional.communityPlatform.moderator.communities.flair_assignments.erase(
        moderatorConnection,
        {
          communityId: community.id,
          assignmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 6. Test 2: Delete with valid assignment ID but wrong community ID
  await TestValidator.error(
    "should reject assignment from wrong community",
    async () => {
      await api.functional.communityPlatform.moderator.communities.flair_assignments.erase(
        moderatorConnection,
        {
          communityId: typia.random<string & tags.Format<"uuid">>(),
          assignmentId: moderatorAssignment.id,
        },
      );
    },
  );
  // 7. Test 3: Delete with both IDs invalid
  await TestValidator.error(
    "should reject completely invalid IDs",
    async () => {
      await api.functional.communityPlatform.moderator.communities.flair_assignments.erase(
        moderatorConnection,
        {
          communityId: typia.random<string & tags.Format<"uuid">>(),
          assignmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
