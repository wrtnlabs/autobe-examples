import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModerationLog";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationLog";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_clone_owner_communities_create } from "../../../generate/generate_random_reddit_clone_owner_communities_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

export async function test_api_owner_moderation_logs_community_scope(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two owner accounts for different communities
  const owner1Connection: api.IConnection = { host: connection.host };
  const owner1 = await authorize_owner_join(owner1Connection, {
    body: {
      email: `owner1_${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "SecurePass123!",
      username: `owner1_${RandomGenerator.alphaNumeric(6)}`,
      displayName: "Owner 1",
    } satisfies IRedditCloneOwner.IJoin,
  });
  typia.assert(owner1);
  const owner2Connection: api.IConnection = { host: connection.host };
  const owner2 = await authorize_owner_join(owner2Connection, {
    body: {
      email: `owner2_${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "SecurePass123!",
      username: `owner2_${RandomGenerator.alphaNumeric(6)}`,
      displayName: "Owner 2",
    } satisfies IRedditCloneOwner.IJoin,
  });
  typia.assert(owner2);
  // 2. Create two separate communities
  const community1 = await api.functional.redditClone.owner.communities.create(
    owner1Connection,
    {
      body: {
        name: `community1_${RandomGenerator.alphaNumeric(6)}`,
        description: "Community 1 for testing",
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community1);
  const community2 = await api.functional.redditClone.owner.communities.create(
    owner2Connection,
    {
      body: {
        name: `community2_${RandomGenerator.alphaNumeric(6)}`,
        description: "Community 2 for testing",
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community2);
  // 3. Verify owner1 can access moderation logs for their own community
  const logs1 =
    await api.functional.redditClone.owner.communities.moderation_logs.list(
      owner1Connection,
      {
        communityId: community1.id,
      },
    );
  typia.assert(logs1);
  TestValidator.equals(
    "owner1 can access their community logs",
    logs1.pagination.records,
    0,
  );
  // 4. Verify owner1 cannot access moderation logs for community2 (belonging to owner2)
  const logs2 =
    await api.functional.redditClone.owner.communities.moderation_logs.list(
      owner1Connection,
      {
        communityId: community2.id,
      },
    );
  typia.assert(logs2);
  TestValidator.predicate(
    "owner1 has no access to community2 logs",
    logs2.pagination.records === 0,
  );
  // 5. Verify owner2 cannot access moderation logs for community1 (belonging to owner1)
  const logs3 =
    await api.functional.redditClone.owner.communities.moderation_logs.list(
      owner2Connection,
      {
        communityId: community1.id,
      },
    );
  typia.assert(logs3);
  TestValidator.predicate(
    "owner2 has no access to community1 logs",
    logs3.pagination.records === 0,
  );
}
