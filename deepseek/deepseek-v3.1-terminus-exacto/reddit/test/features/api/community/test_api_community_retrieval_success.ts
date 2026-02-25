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

export async function test_api_community_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  typia.assert(user);
  // Create community using the authenticated user connection
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  // Retrieve the community details using public connection (endpoint doesn't require auth)
  const retrievedCommunity =
    await api.functional.communityPlatform.communities.at(connection, {
      communityId: community.id,
    });
  typia.assert(retrievedCommunity);
  // Validate community structure matches creation data
  TestValidator.equals("community ID", retrievedCommunity.id, community.id);
  TestValidator.equals(
    "community name",
    retrievedCommunity.name,
    community.name,
  );
  TestValidator.equals(
    "community description",
    retrievedCommunity.description,
    community.description,
  );
  // Validate optional icon_url field if present
  if (community.icon_url !== undefined && community.icon_url !== null) {
    TestValidator.equals(
      "community icon_url",
      retrievedCommunity.icon_url,
      community.icon_url,
    );
  }
  // Validate timestamp formats
  TestValidator.predicate(
    "created_at is ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      retrievedCommunity.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      retrievedCommunity.updated_at,
    ),
  );
  TestValidator.equals(
    "deleted_at is null",
    retrievedCommunity.deleted_at,
    null,
  );
  // Validate owner structure matches the creating user
  TestValidator.equals("owner ID", retrievedCommunity.owner.id, user.id);
  TestValidator.equals(
    "owner username",
    retrievedCommunity.owner.username,
    user.username,
  );
  TestValidator.equals(
    "owner display_name",
    retrievedCommunity.owner.display_name,
    user.display_name,
  );
  TestValidator.equals(
    "owner avatar_url",
    retrievedCommunity.owner.avatar_url,
    user.avatar_url,
  );
  TestValidator.equals(
    "owner karma",
    retrievedCommunity.owner.karma,
    user.karma,
  );
  TestValidator.predicate(
    "owner created_at is ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      retrievedCommunity.owner.created_at,
    ),
  );
}
