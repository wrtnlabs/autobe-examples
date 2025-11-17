import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunitySubscription";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityForumCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumCommunitySubscription";

export async function test_api_user_subscriptions_retrieval(
  connection: api.IConnection,
) {
  // Create a test user for subscription testing
  const userJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "test_password_123",
    username:
      RandomGenerator.name(1)
        .replace(/[^a-zA-Z0-9_]/g, "")
        .substring(0, 20) || "testuser",
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoin,
    });
  typia.assert(user);

  // Create test communities for subscription
  const community1Data = {
    name: "TestCommunity1",
    slug: "test-community-1",
    title: "Test Community 1",
    description: "First test community for subscription testing",
    rules: "Be respectful and follow guidelines",
    privacy_level: "public",
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community1: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: community1Data,
    });
  typia.assert(community1);

  const community2Data = {
    name: "TestCommunity2",
    slug: "test-community-2",
    title: "Test Community 2",
    description: "Second test community for subscription testing",
    rules: "Be respectful and follow guidelines",
    privacy_level: "public",
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community2: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: community2Data,
    });
  typia.assert(community2);

  // Subscribe user to communities
  const subscription1: ICommunityForumCommunitySubscription =
    await api.functional.communityForum.user.communities.subscriptions.create(
      connection,
      {
        communitySlug: community1.slug,
      },
    );
  typia.assert(subscription1);

  const subscription2: ICommunityForumCommunitySubscription =
    await api.functional.communityForum.user.communities.subscriptions.create(
      connection,
      {
        communitySlug: community2.slug,
      },
    );
  typia.assert(subscription2);

  // Test retrieving user subscriptions with pagination
  const subscriptionList: IPageICommunityForumCommunitySubscription.ISummary =
    await api.functional.communityForum.user.users.subscriptions.index(
      connection,
      {
        username: user.username,
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          order: "desc",
        } satisfies ICommunityForumCommunitySubscription.IRequest,
      },
    );
  typia.assert(subscriptionList);

  // Validate the subscription list
  TestValidator.equals(
    "subscription list should have correct pagination info",
    subscriptionList.pagination.current,
    1,
  );

  TestValidator.equals(
    "subscription list should have correct limit",
    subscriptionList.pagination.limit,
    10,
  );

  TestValidator.equals(
    "subscription list should contain 2 subscriptions",
    subscriptionList.pagination.records,
    2,
  );

  TestValidator.equals(
    "subscription list should have 1 page",
    subscriptionList.pagination.pages,
    1,
  );

  TestValidator.equals(
    "subscription list should contain 2 data items",
    subscriptionList.data.length,
    2,
  );

  // Validate subscription data structure
  TestValidator.predicate(
    "subscriptions should have correct user reference",
    () => subscriptionList.data.every((sub) => sub.user.id === user.id),
  );

  TestValidator.predicate(
    "subscriptions should have correct community references",
    () => {
      const communityIds = subscriptionList.data.map((sub) => sub.community.id);
      return (
        communityIds.includes(community1.id) &&
        communityIds.includes(community2.id)
      );
    },
  );

  // Test pagination with limit of 1
  const paginatedSubscriptions: IPageICommunityForumCommunitySubscription.ISummary =
    await api.functional.communityForum.user.users.subscriptions.index(
      connection,
      {
        username: user.username,
        body: {
          page: 1,
          limit: 1,
          sort_by: "created_at",
          order: "desc",
        } satisfies ICommunityForumCommunitySubscription.IRequest,
      },
    );
  typia.assert(paginatedSubscriptions);

  TestValidator.equals(
    "paginated subscription list should have 1 item",
    paginatedSubscriptions.data.length,
    1,
  );

  TestValidator.equals(
    "paginated subscription list should have correct total records",
    paginatedSubscriptions.pagination.records,
    2,
  );

  TestValidator.equals(
    "paginated subscription list should have 2 pages",
    paginatedSubscriptions.pagination.pages,
    2,
  );

  // Test sorting by created_at ascending
  const sortedAscSubscriptions: IPageICommunityForumCommunitySubscription.ISummary =
    await api.functional.communityForum.user.users.subscriptions.index(
      connection,
      {
        username: user.username,
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          order: "asc",
        } satisfies ICommunityForumCommunitySubscription.IRequest,
      },
    );
  typia.assert(sortedAscSubscriptions);

  // Validate sorting order (first subscription should be older)
  if (sortedAscSubscriptions.data.length >= 2) {
    TestValidator.predicate(
      "subscriptions should be sorted by created_at ascending",
      () =>
        new Date(sortedAscSubscriptions.data[0].created_at) <=
        new Date(sortedAscSubscriptions.data[1].created_at),
    );
  }
}
