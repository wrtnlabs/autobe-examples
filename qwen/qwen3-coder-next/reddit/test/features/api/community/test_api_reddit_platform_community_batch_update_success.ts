import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

/**
 * Test batch community update functionality.
 * 1. Create admin and member accounts
 * 2. Create two communities as member
 * 3. Update both communities via batch update as admin
 * 4. Verify updates were successful
 */
export async function test_api_reddit_platform_community_batch_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate admin credentials once for both registration and login
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditPlatformAdmin.IJoin;
  // Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  // Login as admin
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminCredentials.email,
      password: adminCredentials.password,
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  // 2. Auth member for community creation
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  // 3. Create two communities for batch update
  const community1 =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: "community1" + RandomGenerator.alphaNumeric(6),
          description: "Description for community 1",
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  const community2 =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: "community2" + RandomGenerator.alphaNumeric(6),
          description: "Description for community 2",
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  // 4. Perform batch update on both communities
  const updateResponse =
    await api.functional.redditPlatform.communities.updateBatch(
      adminLoginConnection,
      {
        body: {
          communities: [
            {
              name: community1.name,
              description: "Updated description for community 1",
              iconUrl: "https://example.com/icon1.png",
            } satisfies IRedditPlatformCommunity.IUpdate,
            {
              name: community2.name,
              description: "Updated description for community 2",
              iconUrl: "https://example.com/icon2.png",
            } satisfies IRedditPlatformCommunity.IUpdate,
          ],
        } satisfies IRedditPlatformCommunity.IUpdateBatch,
      },
    );
  typia.assert(updateResponse);
  // 5. Verify the batch update response
  TestValidator.equals(
    "two communities updated",
    updateResponse.communities.length,
    2,
  );
  TestValidator.equals(
    "first community description updated",
    updateResponse.communities[0].description,
    "Updated description for community 1",
  );
  TestValidator.equals(
    "second community description updated",
    updateResponse.communities[1].description,
    "Updated description for community 2",
  );
}
