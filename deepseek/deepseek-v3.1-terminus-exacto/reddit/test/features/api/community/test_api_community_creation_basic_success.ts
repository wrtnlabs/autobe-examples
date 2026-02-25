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

export async function test_api_community_creation_basic_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create user connection and register a new user
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Step 2: Create community with unique name and description
  const communityData = {
    name: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.user.communities.create(
      userConnection,
      { body: communityData },
    );
  typia.assert(community);
  // Step 3: Validate business logic - data matching and relationships
  TestValidator.equals(
    "community name matches input",
    community.name,
    communityData.name,
  );
  TestValidator.equals(
    "community description matches input",
    community.description,
    communityData.description,
  );
  TestValidator.equals(
    "community icon_url matches input",
    community.icon_url,
    communityData.icon_url,
  );
  TestValidator.predicate(
    "deleted_at should be null for new community",
    community.deleted_at === null,
  );
  // Step 4: Validate owner information integrity
  TestValidator.equals(
    "owner id matches user id",
    community.owner.id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "owner username matches user username",
    community.owner.username,
    authorizedUser.username,
  );
  TestValidator.equals(
    "owner display_name matches user display_name",
    community.owner.display_name,
    authorizedUser.display_name,
  );
  TestValidator.equals(
    "owner avatar_url matches user avatar_url",
    community.owner.avatar_url,
    authorizedUser.avatar_url,
  );
  TestValidator.equals(
    "owner karma is zero for new user",
    community.owner.karma,
    0,
  );
  // Step 5: Test community creation with different name to verify uniqueness
  const communityData2 = {
    name: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community2 =
    await api.functional.communityPlatform.user.communities.create(
      userConnection,
      { body: communityData2 },
    );
  typia.assert(community2);
  // Verify unique community IDs
  TestValidator.notEquals(
    "community IDs should be different",
    community.id,
    community2.id,
  );
}
