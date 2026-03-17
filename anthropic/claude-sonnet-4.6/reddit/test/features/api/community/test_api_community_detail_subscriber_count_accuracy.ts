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

export async function test_api_community_detail_subscriber_count_accuracy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate the first member (community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create a community using the owner's authenticated connection
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  const communityId = community.id;
  // 3. Guest connection to verify subscriber_count (no auth headers)
  const guestConnection: api.IConnection = { host: connection.host };
  // Verify subscriber_count is 0 (owner creating the community does NOT auto-subscribe)
  const detail0 = await api.functional.community.communities.at(
    guestConnection,
    { communityId },
  );
  typia.assert(detail0);
  TestValidator.equals(
    "subscriber_count should be 0 initially",
    detail0.subscriber_count,
    0,
  );
  // 4. Register and authenticate a second member
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {});
  // 5. Second member subscribes to the community
  const subscription1 =
    await api.functional.community.member.communities.subscriptions.create(
      member2Connection,
      { communityId },
    );
  typia.assert(subscription1);
  // 6. Retrieve community detail as guest
  const detail1 = await api.functional.community.communities.at(
    guestConnection,
    { communityId },
  );
  typia.assert(detail1);
  // 7. Validate subscriber_count is now 1
  TestValidator.equals(
    "subscriber_count should be 1 after second member subscribes",
    detail1.subscriber_count,
    1,
  );
  // 8. Register and authenticate a third member
  const member3Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member3Connection, {});
  // Third member subscribes to the community
  const subscription2 =
    await api.functional.community.member.communities.subscriptions.create(
      member3Connection,
      { communityId },
    );
  typia.assert(subscription2);
  // 9. Retrieve community detail as guest once more
  const detail2 = await api.functional.community.communities.at(
    guestConnection,
    { communityId },
  );
  typia.assert(detail2);
  // 10. Validate subscriber_count is now 2
  TestValidator.equals(
    "subscriber_count should be 2 after third member subscribes",
    detail2.subscriber_count,
    2,
  );
}
