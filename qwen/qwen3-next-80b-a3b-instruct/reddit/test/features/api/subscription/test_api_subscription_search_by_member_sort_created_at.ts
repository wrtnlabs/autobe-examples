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

export async function test_api_subscription_search_by_member_sort_created_at(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member to create subscriptions
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: typia.random<
          string &
            tags.MinLength<8> &
            tags.MaxLength<128> &
            tags.Pattern<"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$">
        >(),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);

  // 2. Create 5 communities
  const communities: ICommunityPlatformCommunity[] = [];

  const community1 =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `community-${RandomGenerator.alphaNumeric(5)}`,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  communities.push(community1);
  typia.assert(community1);

  const community2 =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `community-${RandomGenerator.alphaNumeric(5)}`,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  communities.push(community2);
  typia.assert(community2);

  const community3 =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `community-${RandomGenerator.alphaNumeric(5)}`,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  communities.push(community3);
  typia.assert(community3);

  const community4 =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `community-${RandomGenerator.alphaNumeric(5)}`,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  communities.push(community4);
  typia.assert(community4);

  const community5 =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `community-${RandomGenerator.alphaNumeric(5)}`,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  communities.push(community5);
  typia.assert(community5);

  // 3. Subscribe to each community sequentially (no artificial delays - server timestamps ensure order)
  const subscriptions: ICommunityPlatformSubscription[] = [];

  const subscription1 =
    await api.functional.communityPlatform.member.subscriptions.create(
      connection,
      {
        body: {
          community_id: community1.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  subscriptions.push(subscription1);
  typia.assert(subscription1);

  const subscription2 =
    await api.functional.communityPlatform.member.subscriptions.create(
      connection,
      {
        body: {
          community_id: community2.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  subscriptions.push(subscription2);
  typia.assert(subscription2);

  const subscription3 =
    await api.functional.communityPlatform.member.subscriptions.create(
      connection,
      {
        body: {
          community_id: community3.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  subscriptions.push(subscription3);
  typia.assert(subscription3);

  const subscription4 =
    await api.functional.communityPlatform.member.subscriptions.create(
      connection,
      {
        body: {
          community_id: community4.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  subscriptions.push(subscription4);
  typia.assert(subscription4);

  const subscription5 =
    await api.functional.communityPlatform.member.subscriptions.create(
      connection,
      {
        body: {
          community_id: community5.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  subscriptions.push(subscription5);
  typia.assert(subscription5);

  // 4. Validate descending order (newest first)
  const descendingResponse: IPageICommunityPlatformSubscription =
    await api.functional.communityPlatform.member.subscriptions.search(
      connection,
      {
        body: {
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(descendingResponse);
  TestValidator.equals(
    "descending order has 5 subscriptions",
    descendingResponse.data.length,
    5,
  );

  // Validate that subscriptions are in descending chronological order (newest first) by direct string comparison
  // ISO 8601 strings can be compared lexically because they're year-first
  for (let i = 0; i < descendingResponse.data.length - 1; i++) {
    const current = descendingResponse.data[i];
    const next = descendingResponse.data[i + 1];
    TestValidator.predicate(
      `subscription at index ${i} is newer than subscription at index ${i + 1}`,
      current.created_at >= next.created_at,
    );
  }

  // 5. Validate ascending order (oldest first)
  const ascendingResponse: IPageICommunityPlatformSubscription =
    await api.functional.communityPlatform.member.subscriptions.search(
      connection,
      {
        body: {
          sortBy: "created_at",
          sortOrder: "asc",
        } satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(ascendingResponse);
  TestValidator.equals(
    "ascending order has 5 subscriptions",
    ascendingResponse.data.length,
    5,
  );

  // Validate that subscriptions are in ascending chronological order (oldest first)
  for (let i = 0; i < ascendingResponse.data.length - 1; i++) {
    const current = ascendingResponse.data[i];
    const next = ascendingResponse.data[i + 1];
    TestValidator.predicate(
      `subscription at index ${i} is older than subscription at index ${i + 1}`,
      current.created_at <= next.created_at,
    );
  }

  // 6. Verify that the subscription creation order matches the chronological order directly from timestamps
  // Sort the original subscriptions by created_at in ascending order to find expected order
  const sortedSubscriptions = [...subscriptions].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );
  const expectedAscendingIds = sortedSubscriptions.map((s) => s.id);
  const expectedDescendingIds = [...expectedAscendingIds].reverse();

  // Validate ascending order matches creation order with regard to timestamps
  TestValidator.equals(
    "ascending order matches chronology of creation",
    ascendingResponse.data.map((s) => s.id),
    expectedAscendingIds,
  );

  // Validate descending order matches chronology reversed
  TestValidator.equals(
    "descending order matches chronology of creation reversed",
    descendingResponse.data.map((s) => s.id),
    expectedDescendingIds,
  );
}
