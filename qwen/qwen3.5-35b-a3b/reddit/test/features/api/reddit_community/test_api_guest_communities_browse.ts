import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_communities_browse(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest registration (prerequisite)
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(guest);
  // 2. Browse communities with default pagination
  const communitiesConnection: api.IConnection = { host: connection.host };
  const result = await api.functional.redditCommunity.guest.communities.index(
    communitiesConnection,
    {
      body: {
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(result);
  // 3. Validate pagination structure
  TestValidator.equals(
    "pagination has current page",
    result.pagination.current,
    1,
  );
  TestValidator.equals("pagination has limit", result.pagination.limit, 10);
  TestValidator.predicate(
    "pagination has records",
    result.pagination.records >= 0,
  );
  TestValidator.predicate("pagination has pages", result.pagination.pages >= 0);
  // 4. Validate data array structure
  TestValidator.predicate(
    "data array is populated",
    result.data.length > 0 || result.pagination.records === 0,
  );
  // 5. Validate each community has valid structure
  for (const community of result.data) {
    TestValidator.equals(
      "community has valid id",
      community.id,
      undefined,
      (key) => key === "deleted_at",
    );
    TestValidator.equals(
      "community has name",
      community.name,
      undefined,
      (key) => key === "deleted_at",
    );
    TestValidator.equals(
      "community has created_at",
      community.created_at,
      undefined,
      (key) => key === "deleted_at",
    );
    TestValidator.predicate(
      "community deleted_at is null (non-deleted)",
      community.deleted_at === null || community.deleted_at === undefined,
    );
  }
  // 6. Validate default sorting by subscriber_count DESC (most popular first)
  if (result.data.length >= 2) {
    const firstCommunity = result.data[0];
    const secondCommunity = result.data[1];
    const firstCount = firstCommunity.subscriber_count ?? 0;
    const secondCount = secondCommunity.subscriber_count ?? 0;
    TestValidator.predicate(
      "communities sorted by subscriber_count DESC",
      firstCount >= secondCount,
    );
  }
  // 7. Validate subscriber_count aggregation
  for (const community of result.data) {
    TestValidator.predicate(
      "subscriber_count is non-negative",
      community.subscriber_count === undefined ||
        community.subscriber_count >= 0,
    );
  }
}
