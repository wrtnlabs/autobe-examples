import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySubscription";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_subscriptions_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Test default list (no filters)
  const defaultList =
    await api.functional.redditCommunity.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCommunitySubscription.IRequest,
      },
    );
  typia.assert(defaultList);
  // 3. Validate pagination structure
  TestValidator.equals("pagination current", defaultList.pagination.current, 1);
  TestValidator.equals("pagination limit", defaultList.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    defaultList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    defaultList.pagination.pages >= 0,
  );
  // 4. Test filtering by status='active'
  const activeList =
    await api.functional.redditCommunity.member.subscriptions.index(
      memberConnection,
      {
        body: {
          status: "active" as const,
        } satisfies IRedditCommunitySubscription.IRequest,
      },
    );
  typia.assert(activeList);
  // 5. Test filtering by status='terminated'
  const terminatedList =
    await api.functional.redditCommunity.member.subscriptions.index(
      memberConnection,
      {
        body: {
          status: "terminated" as const,
        } satisfies IRedditCommunitySubscription.IRequest,
      },
    );
  typia.assert(terminatedList);
  // 6. Test filtering by status='all'
  const allList =
    await api.functional.redditCommunity.member.subscriptions.index(
      memberConnection,
      {
        body: {
          status: "all" as const,
        } satisfies IRedditCommunitySubscription.IRequest,
      },
    );
  typia.assert(allList);
  // 7. Test text search filtering
  const searchList =
    await api.functional.redditCommunity.member.subscriptions.index(
      memberConnection,
      {
        body: {
          search: "test" as string & tags.MaxLength<100>,
        } satisfies IRedditCommunitySubscription.IRequest,
      },
    );
  typia.assert(searchList);
  // 8. Test sorting by created_at ASC
  const sortAscList =
    await api.functional.redditCommunity.member.subscriptions.index(
      memberConnection,
      {
        body: {
          sort: "created_at" as const,
          direction: "ASC" as const,
        } satisfies IRedditCommunitySubscription.IRequest,
      },
    );
  typia.assert(sortAscList);
  // 9. Test sorting by created_at DESC
  const sortDescList =
    await api.functional.redditCommunity.member.subscriptions.index(
      memberConnection,
      {
        body: {
          sort: "created_at" as const,
          direction: "DESC" as const,
        } satisfies IRedditCommunitySubscription.IRequest,
      },
    );
  typia.assert(sortDescList);
  // 10. Test sorting by community_name
  const sortNameList =
    await api.functional.redditCommunity.member.subscriptions.index(
      memberConnection,
      {
        body: {
          sort: "community_name" as const,
          direction: "ASC" as const,
        } satisfies IRedditCommunitySubscription.IRequest,
      },
    );
  typia.assert(sortNameList);
  // 11. Test sorting by subscriber_count
  const sortSubscriberList =
    await api.functional.redditCommunity.member.subscriptions.index(
      memberConnection,
      {
        body: {
          sort: "subscriber_count" as const,
          direction: "DESC" as const,
        } satisfies IRedditCommunitySubscription.IRequest,
      },
    );
  typia.assert(sortSubscriberList);
  // 12. Test date range filtering
  const startDate = new Date(2024, 0, 1);
  const endDate = new Date(2024, 11, 31);
  const dateRangeList =
    await api.functional.redditCommunity.member.subscriptions.index(
      memberConnection,
      {
        body: {
          startDate: startDate.toISOString().split("T")[0] as string &
            tags.Format<"date">,
          endDate: endDate.toISOString().split("T")[0] as string &
            tags.Format<"date">,
        } satisfies IRedditCommunitySubscription.IRequest,
      },
    );
  typia.assert(dateRangeList);
  // 13. Test pagination metadata consistency
  TestValidator.equals(
    "pages calculated correctly",
    Math.ceil(defaultList.pagination.records / defaultList.pagination.limit),
    defaultList.pagination.pages,
  );
}
