import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { generate_random_community_platform_moderator_communities_create } from "../../../generate/generate_random_community_platform_moderator_communities_create";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_community_update_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Step 2: Create a community
  const community =
    await generate_random_community_platform_moderator_communities_create(
      moderatorConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Update the community with empty body (only valid update possible since IUpdate is empty)
  const updatedCommunity =
    await api.functional.communityPlatform.moderator.communities.update(
      moderatorConnection,
      {
        communityCode: community.community_code,
        body: {} satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);
  // Step 4: Validate that community code remains unchanged
  TestValidator.equals(
    "community code unchanged",
    updatedCommunity.community_code,
    community.community_code,
  );
}
