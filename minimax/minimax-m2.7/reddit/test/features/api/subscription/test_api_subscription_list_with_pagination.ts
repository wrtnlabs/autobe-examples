import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneSubscription";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_subscription_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  memberConnection.headers = { Authorization: authorized.token.access };
  // 2. Create multiple communities for subscription testing
  const COMMUNITY_COUNT = 7;
  const communities = await ArrayUtil.asyncRepeat(COMMUNITY_COUNT, async () => {
    return await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  });
  // 3. Create subscriptions to all communities
  for (const community of communities) {
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: { communityId: community.id },
      },
    );
  }
  // 4. Test default pagination (page 1, default limit, order by created_at DESC)
  const page1 = await api.functional.redditClone.member.subscriptions.index(
    memberConnection,
    {
      body: {} satisfies IRedditCloneSubscription.IRequest,
    },
  );
  typia.assert(page1);
  // Validate pagination metadata
  TestValidator.equals(
    "total records matches subscription count",
    page1.pagination.records,
    COMMUNITY_COUNT,
  );
  TestValidator.predicate(
    "has pages greater than 0",
    page1.pagination.pages > 0,
  );
  TestValidator.equals("current page is 1", page1.pagination.current, 1);
  // Validate subscription records contain community details
  TestValidator.predicate("has subscription data", page1.data.length > 0);
  for (const subscription of page1.data) {
    typia.assert(subscription);
    TestValidator.predicate(
      "has community id",
      subscription.community.id !== null &&
        subscription.community.id !== undefined,
    );
    TestValidator.predicate(
      "has community name",
      subscription.community.name !== null &&
        subscription.community.name !== undefined,
    );
    TestValidator.predicate(
      "has subscriber count",
      subscription.community.subscriberCount !== null &&
        subscription.community.subscriberCount !== undefined,
    );
    TestValidator.predicate(
      "has owner info",
      subscription.community.owner !== null &&
        subscription.community.owner !== undefined,
    );
  }
  // 5. Test ordering - subscriptions should be ordered by created_at DESC (newest first)
  for (let i = 0; i < page1.data.length - 1; i++) {
    const currentTime = new Date(page1.data[i].createdAt).getTime();
    const nextTime = new Date(page1.data[i + 1].createdAt).getTime();
    TestValidator.predicate(
      "default order is created_at DESC",
      currentTime >= nextTime,
    );
  }
  // 6. Test explicit order ascending
  const ascOrder = await api.functional.redditClone.member.subscriptions.index(
    memberConnection,
    {
      body: { order: "asc" } satisfies IRedditCloneSubscription.IRequest,
    },
  );
  typia.assert(ascOrder);
  for (let i = 0; i < ascOrder.data.length - 1; i++) {
    const currentTime = new Date(ascOrder.data[i].createdAt).getTime();
    const nextTime = new Date(ascOrder.data[i + 1].createdAt).getTime();
    TestValidator.predicate(
      "asc order is created_at ASC",
      currentTime <= nextTime,
    );
  }
  // 7. Test page navigation with custom limit
  const LIMIT = 3;
  const page1Limited =
    await api.functional.redditClone.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: LIMIT,
        } satisfies IRedditCloneSubscription.IRequest,
      },
    );
  typia.assert(page1Limited);
  TestValidator.equals(
    "page 1 limited has correct limit",
    page1Limited.data.length,
    LIMIT,
  );
  TestValidator.equals(
    "page 1 total records still correct",
    page1Limited.pagination.records,
    COMMUNITY_COUNT,
  );
  TestValidator.equals(
    "page 1 current page",
    page1Limited.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit matches",
    page1Limited.pagination.limit,
    LIMIT,
  );
  const page2 = await api.functional.redditClone.member.subscriptions.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: LIMIT,
      } satisfies IRedditCloneSubscription.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 has correct limit", page2.data.length, LIMIT);
  TestValidator.equals("page 2 current page", page2.pagination.current, 2);
  // Verify no overlap between pages
  const page1Ids = page1Limited.data.map((s) => s.id);
  const page2Ids = page2.data.map((s) => s.id);
  for (const id1 of page1Ids) {
    TestValidator.predicate(
      "page 2 IDs are different from page 1",
      !page2Ids.includes(id1),
    );
  }
  // 8. Verify all subscriptions are accounted for across pages
  const totalOnPages = page1Limited.data.length + page2.data.length;
  const remainingSubscriptions = COMMUNITY_COUNT - totalOnPages;
  if (remainingSubscriptions > 0) {
    const page3 = await api.functional.redditClone.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 3,
          limit: LIMIT,
        } satisfies IRedditCloneSubscription.IRequest,
      },
    );
    typia.assert(page3);
    TestValidator.equals(
      "page 3 has remaining subscriptions",
      page3.data.length,
      remainingSubscriptions,
    );
  }
  // 9. Verify subscriptions still exist and community details preserved
  const page1Again =
    await api.functional.redditClone.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: LIMIT,
        } satisfies IRedditCloneSubscription.IRequest,
      },
    );
  typia.assert(page1Again);
  // Verify same subscription IDs are returned (stability)
  for (let i = 0; i < page1Again.data.length; i++) {
    TestValidator.equals(
      "subscription ID stable across requests",
      page1Again.data[i].id,
      page1Limited.data[i].id,
    );
  }
  // 10. Test search filter
  const searchName = page1.data[0].community.name;
  const searchTerm = searchName.substring(0, Math.min(3, searchName.length));
  const searchedPage =
    await api.functional.redditClone.member.subscriptions.index(
      memberConnection,
      {
        body: {
          search: searchTerm,
        } satisfies IRedditCloneSubscription.IRequest,
      },
    );
  typia.assert(searchedPage);
  TestValidator.predicate(
    "search returns results",
    searchedPage.data.length > 0,
  );
  for (const subscription of searchedPage.data) {
    const nameMatch = subscription.community.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    TestValidator.predicate("search filter matches community name", nameMatch);
  }
}
