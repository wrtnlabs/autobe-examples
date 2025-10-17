import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSubscription";

export async function test_api_subscription_search_by_member_filter_active(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);

  // 2. Create 5 communities to subscribe to
  const createdCommunities: ICommunityPlatformCommunity[] =
    await ArrayUtil.asyncRepeat(5, async () => {
      const community: ICommunityPlatformCommunity =
        await api.functional.communityPlatform.member.communities.create(
          connection,
          {
            body: {
              name: RandomGenerator.name(1),
              description: RandomGenerator.paragraph({
                sentences: 2,
                wordMin: 4,
                wordMax: 8,
              }),
            } satisfies ICommunityPlatformCommunity.ICreate,
          },
        );
      typia.assert(community);
      return community;
    });

  // 3. Subscribe to all 5 communities
  const createdSubscriptions: ICommunityPlatformSubscription[] = [];
  for (const community of createdCommunities) {
    const subscription: ICommunityPlatformSubscription =
      await api.functional.communityPlatform.member.subscriptions.create(
        connection,
        {
          body: {
            community_id: community.id,
          } satisfies ICommunityPlatformSubscription.ICreate,
        },
      );
    typia.assert(subscription);
    createdSubscriptions.push(subscription);
  }

  // 4. Deactivate 2 of the subscriptions (second and fourth)
  // First deactivated subscription (index 1)
  await api.functional.communityPlatform.member.subscriptions.update(
    connection,
    {
      subscriptionId: createdSubscriptions[1].id,
      body: {
        active: false,
      } satisfies ICommunityPlatformSubscription.IUpdate,
    },
  );

  // Second deactivated subscription (index 3)
  await api.functional.communityPlatform.member.subscriptions.update(
    connection,
    {
      subscriptionId: createdSubscriptions[3].id,
      body: {
        active: false,
      } satisfies ICommunityPlatformSubscription.IUpdate,
    },
  );

  // 5. Query with active=true - should return 3 active subscriptions
  const activeResponse: IPageICommunityPlatformSubscription =
    await api.functional.communityPlatform.member.subscriptions.search(
      connection,
      {
        body: {
          status: "active",
        } satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(activeResponse);
  TestValidator.equals("active status count", activeResponse.data.length, 3);
  TestValidator.predicate(
    "all active subscriptions are active",
    activeResponse.data.every((sub) => sub.active === true),
  );

  // 6. Query with active=false - should return 2 inactive subscriptions
  const inactiveResponse: IPageICommunityPlatformSubscription =
    await api.functional.communityPlatform.member.subscriptions.search(
      connection,
      {
        body: {
          status: "inactive",
        } satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(inactiveResponse);
  TestValidator.equals(
    "inactive status count",
    inactiveResponse.data.length,
    2,
  );
  TestValidator.predicate(
    "all inactive subscriptions are inactive",
    inactiveResponse.data.every((sub) => sub.active === false),
  );

  // 7. Query without filter - should return all 5 subscriptions
  const allResponse: IPageICommunityPlatformSubscription =
    await api.functional.communityPlatform.member.subscriptions.search(
      connection,
      {
        body: {
          // No status filter - default should be all subscriptions
        } satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(allResponse);
  TestValidator.equals("all subscriptions count", allResponse.data.length, 5);

  // 8. Verify the active/inactive subscriptions match the expected ones
  const activeSubIds = new Set(
    createdSubscriptions
      .filter((_, index) => index !== 1 && index !== 3)
      .map((sub) => sub.id),
  );
  const inactiveSubIds = new Set([
    createdSubscriptions[1].id,
    createdSubscriptions[3].id,
  ]);

  TestValidator.predicate(
    "active response contains correct active subscriptions",
    activeResponse.data.every((sub) => activeSubIds.has(sub.id)),
  );
  TestValidator.predicate(
    "inactive response contains correct inactive subscriptions",
    inactiveResponse.data.every((sub) => inactiveSubIds.has(sub.id)),
  );
}
