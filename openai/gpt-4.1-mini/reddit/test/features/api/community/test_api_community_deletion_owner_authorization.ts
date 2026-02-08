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

export async function test_api_community_deletion_owner_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful community deletion by its owner.
  {
    const user1Connection: api.IConnection = { host: connection.host };
    // User1 joins the platform
    const authorized1 = await authorize_user_join(user1Connection, {
      body: {},
    });
    typia.assert(authorized1);
    // Set user1Connection authorization header
    user1Connection.headers = {
      Authorization: `Bearer ${authorized1.token.access}`,
    };
    // User1 creates a new community
    const community1 =
      await generate_random_community_platform_user_communities_create_community(
        user1Connection,
        {},
      );
    typia.assert(community1);
    // Extract community ID using assertion
    const community1Id = (community1 as unknown as { id: string }).id;
    // User1 deletes their community
    await api.functional.communityPlatform.user.communities.erase(
      user1Connection,
      {
        communityId: community1Id,
      },
    );
    // No content is expected; attempting to delete again should cause 404 or error
    await TestValidator.error(
      "deleting already deleted community should error",
      async () =>
        await api.functional.communityPlatform.user.communities.erase(
          user1Connection,
          {
            communityId: community1Id,
          },
        ),
    );
  }
  // Scenario 2: Unauthorized community deletion attempt by a non-owner user.
  {
    // User1 connection
    const user1Connection: api.IConnection = { host: connection.host };
    const authorized1 = await authorize_user_join(user1Connection, {
      body: {},
    });
    typia.assert(authorized1);
    user1Connection.headers = {
      Authorization: `Bearer ${authorized1.token.access}`,
    };
    // User1 creates a community
    const community =
      await generate_random_community_platform_user_communities_create_community(
        user1Connection,
        {},
      );
    typia.assert(community);
    // Extract community ID
    const communityId = (community as unknown as { id: string }).id;
    // User2 connection
    const user2Connection: api.IConnection = { host: connection.host };
    const authorized2 = await authorize_user_join(user2Connection, {
      body: {},
    });
    typia.assert(authorized2);
    user2Connection.headers = {
      Authorization: `Bearer ${authorized2.token.access}`,
    };
    // User2 attempts to delete User1's community and expects 403 Forbidden
    await TestValidator.httpError(
      "unauthorized user cannot delete community",
      403,
      async () =>
        await api.functional.communityPlatform.user.communities.erase(
          user2Connection,
          {
            communityId: communityId,
          },
        ),
    );
  }
}
