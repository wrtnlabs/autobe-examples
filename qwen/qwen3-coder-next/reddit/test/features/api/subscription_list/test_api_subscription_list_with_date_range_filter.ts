import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformSubscription";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_subscription_list_with_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connections with different subscription times
  const memberConnection1: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(memberConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member1);
  const memberConnection2: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(memberConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member2);
  // 3. Subscribe members to a community with time delays
  // Since community creation API is not available, use a fixed community ID for testing
  const communityId = "00000000-0000-0000-0000-000000000001";
  await api.functional.redditPlatform.member.communities.subscriptions.create(
    memberConnection1,
    { communityId: communityId },
  );
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await api.functional.redditPlatform.member.communities.subscriptions.create(
    memberConnection1,
    { communityId: communityId },
  );
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await api.functional.redditPlatform.member.communities.subscriptions.create(
    memberConnection2,
    { communityId: communityId },
  );
  // 4. Wait a bit for subscriptions to be created
  await new Promise((resolve) => setTimeout(resolve, 2000));
  // 5. Get subscription list with date range filter
  const afterMember1FirstSubscription = new Date(
    new Date(member1.created_at).getTime() + 1000,
  ).toISOString();
  const beforeMember1ThirdSubscription = new Date(
    new Date(member1.created_at).getTime() + 2500,
  ).toISOString();
  const subscriptionList =
    await api.functional.redditPlatform.member.subscriptions.index(
      memberConnection1,
      {
        body: {
          createdAtFrom: afterMember1FirstSubscription,
          createdAtTo: beforeMember1ThirdSubscription,
        },
      },
    );
  typia.assert(subscriptionList);
  // 6. Verify the subscription list contains the expected subscriptions
  TestValidator.equals(
    "member1 should have 2 subscriptions in the date range",
    subscriptionList.data.length,
    2,
  );
  // Since we used the same community ID twice, check that subscriptions exist
  TestValidator.equals(
    "member1's subscriptions should exist",
    subscriptionList.data.length > 0,
    true,
  );
}
