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
import { generate_random_community_platform_user_communities_create_community } from "../../../generate/generate_random_community_platform_user_communities_create_community";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_create_duplicate_name_failure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a user and authorize
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {
    body: {},
  });
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. Create a community with a unique random name
  const originalCommunity =
    await generate_random_community_platform_user_communities_create_community(
      userConnection,
      {},
    );
  typia.assert(originalCommunity);
  // 3. Attempt to create another community with the same name
  const duplicateBody = originalCommunity satisfies
    ICommunityPlatformCommunity.ICreate as ICommunityPlatformCommunity.ICreate;
  // 4. Validate that duplicate creation triggers error
  await TestValidator.error(
    "duplicate community name creation should fail",
    async () => {
      await generate_random_community_platform_user_communities_create_community(
        userConnection,
        { body: duplicateBody },
      );
    },
  );
}
