import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

/**
 * Test error scenarios when flair or community does not exist.
 * This tests the validation logic that prevents deletion of non-existent resources
 * or cross-community flair deletion, which is important for data integrity and security.
 */
export async function test_api_community_flair_deletion_not_found_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // 2. Create a community using user authentication
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Test deletion with invalid flairId (non-existent UUID)
  await TestValidator.httpError(
    "invalid flairId should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.communities.flairs.erase(
        moderatorConnection,
        {
          communityId: community.id,
          flairId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 4. Test deletion with invalid communityId (UUID that doesn't correspond to any community)
  await TestValidator.httpError(
    "invalid communityId should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.communities.flairs.erase(
        moderatorConnection,
        {
          communityId: typia.random<string & tags.Format<"uuid">>(),
          flairId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Note: Cross-community flair deletion test is not possible without flair creation API
  // The scenario requirement for testing flairId that belongs to a different community
  // cannot be implemented with the available APIs, so it's omitted
}
