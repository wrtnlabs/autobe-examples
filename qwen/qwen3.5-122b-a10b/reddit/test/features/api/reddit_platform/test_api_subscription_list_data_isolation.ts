import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunitySubscription";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_subscription_list_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A and authenticate
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
        typia.random<string & tags.Format<"email">>(),
      ),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Create Member B and authenticate
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
        typia.random<string & tags.Format<"email">>(),
      ),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberB);
  // 3. Create two communities using member A as owner
  const communityA =
    await generate_random_reddit_platform_member_communities_create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityA);
  const communityB =
    await generate_random_reddit_platform_member_communities_create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityB);
  // 4. Member A subscribes to Community A
  const subscriptionA =
    await api.functional.redditPlatform.member.communities.subscriptions.create(
      memberAConnection,
      {
        communityId: communityA.id,
      },
    );
  typia.assert(subscriptionA);
  // 5. Member B subscribes to Community B
  const subscriptionB =
    await api.functional.redditPlatform.member.communities.subscriptions.create(
      memberBConnection,
      {
        communityId: communityB.id,
      },
    );
  typia.assert(subscriptionB);
  // 6. Member A queries their subscription list
  const memberASubscriptions =
    await api.functional.redditPlatform.member.subscriptions.index(
      memberAConnection,
      {
        body: {} satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(memberASubscriptions);
  // 7. Member B queries their subscription list
  const memberBSubscriptions =
    await api.functional.redditPlatform.member.subscriptions.index(
      memberBConnection,
      {
        body: {} satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(memberBSubscriptions);
  // 8. Verify data isolation - each member only sees their own subscriptions
  TestValidator.equals(
    "member A has exactly 1 subscription",
    memberASubscriptions.pagination.records,
    1,
  );
  TestValidator.equals(
    "member B has exactly 1 subscription",
    memberBSubscriptions.pagination.records,
    1,
  );
  // 9. Verify member A sees only Community A (not Community B)
  TestValidator.equals(
    "member A sees community A",
    memberASubscriptions.data[0].community.id,
    communityA.id,
  );
  TestValidator.predicate(
    "member A does not see community B",
    !memberASubscriptions.data.some((s) => s.community.id === communityB.id),
  );
  // 10. Verify member B sees only Community B (not Community A)
  TestValidator.equals(
    "member B sees community B",
    memberBSubscriptions.data[0].community.id,
    communityB.id,
  );
  TestValidator.predicate(
    "member B does not see community A",
    !memberBSubscriptions.data.some((s) => s.community.id === communityA.id),
  );
  // 11. Verify communities are different
  TestValidator.notEquals(
    "communities are different",
    communityA.id,
    communityB.id,
  );
  // 12. Verify members are different
  TestValidator.notEquals("members are different", memberA.id, memberB.id);
}