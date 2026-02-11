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

export async function test_api_reddit_platform_community_batch_update_mixed_result(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      display_name: null,
      bio: null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  // 2. Setup member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  // 3. Create one valid community for batch update
  const createdCommunity =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(createdCommunity);
  // 4. Generate truly non-existent community ID ( UUID v7 timestamp-based)
  const nonExistentId = "00000000-0000-0000-0000-000000000000";
  // 5. Prepare batch update with valid and non-existent community IDs
  const updateBatch: IRedditPlatformCommunity.IUpdateBatch = {
    communities: [
      {
        name: createdCommunity.name,
        description: RandomGenerator.paragraph({ sentences: 1 }),
        iconUrl: null,
      },
      {
        name: RandomGenerator.alphabets(7),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        iconUrl: null,
      },
    ],
  };
  // 6. Execute batch update
  const batchUpdateResult =
    await api.functional.redditPlatform.communities.updateBatch(
      adminConnection,
      {
        body: updateBatch,
      },
    );
  typia.assert(batchUpdateResult);
  // 7. Validate response structure
  TestValidator.equals(
    "communities array has one item",
    batchUpdateResult.communities.length,
    1,
  );
  TestValidator.equals(
    "errors array has one item",
    batchUpdateResult.errors.length,
    1,
  );
  // 8. Validate successfully updated community
  const updatedCommunity = batchUpdateResult.communities[0];
  TestValidator.equals(
    "updated community name changed",
    updatedCommunity.name,
    createdCommunity.name,
  );
  TestValidator.equals(
    "updated community description changed",
    updatedCommunity.description,
    updateBatch.communities[0].description,
  );
  // 9. Validate error for non-existent community
  TestValidator.predicate(
    "error array contains expected structure",
    batchUpdateResult.errors.length > 0,
  );
}
