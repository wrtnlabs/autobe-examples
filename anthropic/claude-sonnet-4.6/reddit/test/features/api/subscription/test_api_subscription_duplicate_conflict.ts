import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_subscription_duplicate_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate community owner (member A)
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create a community as member A
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 3. Register and authenticate subscriber (member B)
  const subscriberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(subscriberConnection, {});
  // 4. First subscription — should succeed
  const firstSubscription =
    await api.functional.community.member.communities.subscriptions.create(
      subscriberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(firstSubscription);
  // Validate the first subscription is active (deleted_at is null)
  TestValidator.equals(
    "first subscription is active",
    firstSubscription.deleted_at,
    null,
  );
  // 5. Second subscription attempt — should return 409 Conflict
  await TestValidator.httpError(
    "duplicate subscription returns 409 conflict",
    409,
    async () => {
      await api.functional.community.member.communities.subscriptions.create(
        subscriberConnection,
        {
          communityId: community.id,
        },
      );
    },
  );
}
