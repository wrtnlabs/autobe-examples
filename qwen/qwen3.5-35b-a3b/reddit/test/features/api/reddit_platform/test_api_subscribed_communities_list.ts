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

export async function test_api_subscribed_communities_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(4),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Test default list (empty body)
  const defaultList =
    await api.functional.redditPlatform.member.communities.subscribed.index(
      memberConnection,
      { body: {} },
    );
  typia.assert(defaultList);
  // 3. Test pagination with explicit page and limit
  const paginatedList =
    await api.functional.redditPlatform.member.communities.subscribed.index(
      memberConnection,
      { body: { page: 2, limit: 10 } },
    );
  typia.assert(paginatedList);
  TestValidator.equals("page number", paginatedList.pagination.current, 2);
  TestValidator.equals("limit", paginatedList.pagination.limit, 10);
  // 4. Test sorting by subscribed_at
  const sortedByDate =
    await api.functional.redditPlatform.member.communities.subscribed.index(
      memberConnection,
      { body: { sort_by: "subscribed_at", sort_order: "desc" } },
    );
  typia.assert(sortedByDate);
  // 5. Test sorting by name
  const sortedByName =
    await api.functional.redditPlatform.member.communities.subscribed.index(
      memberConnection,
      { body: { sort_by: "name", sort_order: "asc" } },
    );
  typia.assert(sortedByName);
  // 6. Test sorting by subscriber_count
  const sortedBySubscribers =
    await api.functional.redditPlatform.member.communities.subscribed.index(
      memberConnection,
      { body: { sort_by: "subscriber_count", sort_order: "desc" } },
    );
  typia.assert(sortedBySubscribers);
  // 7. Test search by community name
  const searchTerm = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 6,
  });
  const searchedList =
    await api.functional.redditPlatform.member.communities.subscribed.index(
      memberConnection,
      { body: { search: searchTerm } },
    );
  typia.assert(searchedList);
  // 8. Test date range filtering
  const startDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const endDate = new Date().toISOString();
  const dateFilteredList =
    await api.functional.redditPlatform.member.communities.subscribed.index(
      memberConnection,
      {
        body: {
          subscribed_at_gte: startDate,
          subscribed_at_lte: endDate,
        },
      },
    );
  typia.assert(dateFilteredList);
  // 9. Test combined filters
  const combinedList =
    await api.functional.redditPlatform.member.communities.subscribed.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 5,
          search: searchTerm,
          sort_by: "subscribed_at",
          sort_order: "desc",
          subscribed_at_gte: startDate,
        },
      },
    );
  typia.assert(combinedList);
  // 10. Test filtering by community_id
  const allCommunities =
    await api.functional.redditPlatform.member.communities.subscribed.index(
      memberConnection,
      { body: {} },
    );
  typia.assert(allCommunities);
  if (allCommunities.data.length > 0) {
    const randomCommunity = allCommunities.data[0];
    const byCommunityId =
      await api.functional.redditPlatform.member.communities.subscribed.index(
        memberConnection,
        { body: { community_id: randomCommunity.community.id } },
      );
    typia.assert(byCommunityId);
    TestValidator.equals(
      "filtered by community_id",
      byCommunityId.data.length,
      1,
    );
  }
  // 11. Test filtering by community_name
  if (allCommunities.data.length > 0) {
    const sampleName = allCommunities.data[0].community.name;
    const nameFilter = sampleName.substring(
      0,
      Math.max(2, Math.floor(sampleName.length / 2)),
    );
    const byCommunityName =
      await api.functional.redditPlatform.member.communities.subscribed.index(
        memberConnection,
        { body: { community_name: nameFilter } },
      );
    typia.assert(byCommunityName);
  }
  // 12. Validate pagination metadata structure
  TestValidator.equals(
    "pagination.current is number",
    typeof defaultList.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination.limit is number",
    typeof defaultList.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination.records is number",
    typeof defaultList.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination.pages is number",
    typeof defaultList.pagination.pages,
    "number",
  );
  // 13. Validate each subscription has required fields
  if (defaultList.data.length > 0) {
    const sampleSubscription = defaultList.data[0];
    TestValidator.equals(
      "subscription.id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        sampleSubscription.id,
      ),
      true,
    );
    TestValidator.equals(
      "subscription.community exists",
      sampleSubscription.community !== null,
      true,
    );
    TestValidator.equals(
      "subscription.created_at is date-time",
      !isNaN(new Date(sampleSubscription.created_at).getTime()),
      true,
    );
  }
  // 14. Validate community structure
  if (defaultList.data.length > 0) {
    const sampleCommunity = defaultList.data[0].community;
    TestValidator.equals(
      "community.id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        sampleCommunity.id,
      ),
      true,
    );
    TestValidator.equals(
      "community.name is string",
      typeof sampleCommunity.name,
      "string",
    );
    TestValidator.equals(
      "community.subscriber_count is number",
      typeof sampleCommunity.subscriber_count,
      "number",
    );
    TestValidator.equals(
      "community.owner exists",
      sampleCommunity.owner !== undefined,
      true,
    );
    TestValidator.equals(
      "community.created_at is date-time",
      !isNaN(new Date(sampleCommunity.created_at).getTime()),
      true,
    );
  }
}
