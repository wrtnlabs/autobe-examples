import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_creation_with_optional_icon(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Test 1: Create community with icon URL
  const communityWithIcon =
    await api.functional.communityPlatform.user.communities.create(
      userConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityWithIcon);
  // Validate icon URL is properly set
  TestValidator.notEquals(
    "icon_url should not be null when provided",
    communityWithIcon.icon_url,
    null,
  );
  TestValidator.predicate(
    "icon_url should be valid URI",
    () =>
      communityWithIcon.icon_url !== null &&
      communityWithIcon.icon_url !== undefined,
  );
  // Test 2: Create community without icon URL (null)
  const communityWithoutIcon =
    await api.functional.communityPlatform.user.communities.create(
      userConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: null,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityWithoutIcon);
  // Validate icon URL is null when not provided
  TestValidator.equals(
    "icon_url should be null when not provided",
    communityWithoutIcon.icon_url,
    null,
  );
  // Validate that both communities have different IDs
  TestValidator.notEquals(
    "communities should have different IDs",
    communityWithIcon.id,
    communityWithoutIcon.id,
  );
  // Validate common properties
  TestValidator.predicate(
    "both communities should have valid names",
    communityWithIcon.name.length > 0 && communityWithoutIcon.name.length > 0,
  );
  TestValidator.predicate(
    "both communities should have valid descriptions",
    communityWithIcon.description.length > 0 &&
      communityWithoutIcon.description.length > 0,
  );
  TestValidator.predicate(
    "both communities should have owners",
    communityWithIcon.owner.id === user.id &&
      communityWithoutIcon.owner.id === user.id,
  );
}
