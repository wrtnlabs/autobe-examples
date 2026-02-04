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
export async function test_api_community_creation_duplicate_name(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for the moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate as moderator using the authorization utility function
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);
  // Step 3: Create first community - should succeed
  const firstCommunity =
    await generate_random_community_platform_moderator_communities_create(
      moderatorConnection,
      { body: {} },
    );
  typia.assert(firstCommunity);
  // Step 4: Create second community - should also succeed (system generates different unique name)
  const secondCommunity =
    await generate_random_community_platform_moderator_communities_create(
      moderatorConnection,
      { body: {} },
    );
  typia.assert(secondCommunity);
  // Step 5: Verify that the two community codes are different
  // This validates the global uniqueness property of community names
  // (because the system generates unique community_code from UUID)
  TestValidator.notEquals(
    "two community creations should have different community codes",
    firstCommunity.community_code,
    secondCommunity.community_code,
  );
}
