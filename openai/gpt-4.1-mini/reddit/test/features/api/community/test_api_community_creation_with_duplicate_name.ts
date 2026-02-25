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

/**
 * Test the scenario where creating a community with a duplicate name throws an error.
 *
 * The test flow:
 * 1. Register a new user and obtain an authenticated connection.
 * 2. Create a community with a randomly generated unique name.
 * 3. Attempt to create a second community with the exact same name.
 * 4. Verify that the second creation attempt throws an HTTP error (conflict or bad request) due to duplication.
 */
export async function test_api_community_creation_with_duplicate_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration and authentication
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: "P@ssw0rd1234",
      username: typia.random<string>(),
      displayName: typia.random<string>(),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
      ip: null,
    },
  });
  // Update userConnection with auth token
  userConnection.headers = {
    Authorization: `Bearer ${userAuth.token.access}`,
  };
  // 2. Create a community
  const community1 =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community1);
  // 3. Attempt to create another community with the same name
  const duplicateNameBody: ICommunityPlatformCommunity.ICreate = {
    name: community1.name,
    description: "Attempt to create duplicate community",
    iconUrl: community1.iconUrl,
  };
  // 4. Validate that duplicate creation fails
  await TestValidator.error(
    "duplicate community name should cause error",
    async () => {
      await generate_random_community_platform_user_communities_create(
        userConnection,
        {
          body: duplicateNameBody,
        },
      );
    },
  );
}
