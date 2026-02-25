import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";

export async function test_api_community_discovery_default_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as community owner
  const communityOwnerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_community_owner_join(
    communityOwnerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
      } satisfies IRedditCommunityCommunityOwner.IJoin,
    },
  );
  typia.assert(authorized);
  // 2. Use the authenticated connection to fetch communities with default sorting (subscriber_count desc)
  // No search term provided, default sort must be subscriber_count descending
  const communitiesResponse =
    await api.functional.redditCommunity.communityOwner.communities.index(
      communityOwnerConnection,
      {
        body: {},
      },
    );
  typia.assert(communitiesResponse);
  // 3. Validate response structure - pagination
  TestValidator.equals(
    "current page is 1",
    communitiesResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit is 25 (default)",
    communitiesResponse.pagination.limit,
    25,
  );
  TestValidator.predicate(
    "records > 0",
    communitiesResponse.pagination.records > 0,
  );
  TestValidator.predicate(
    "pages >= 1",
    communitiesResponse.pagination.pages >= 1,
  );
  // 4. Validate each community summary has non-negative subscriber_count
  communitiesResponse.data.forEach((community) => {
    TestValidator.predicate(
      "subscriber_count >= 0",
      community.subscriber_count >= 0,
    );
    TestValidator.predicate(
      "updated_at >= created_at",
      new Date(community.updated_at) >= new Date(community.created_at),
    );
  });
  // 5. Validate default sorting by subscriber_count descending
  // Sort by subscriber_count descending: each entry should have >= subscriber_count than next
  for (let i = 0; i < communitiesResponse.data.length - 1; i++) {
    const current = communitiesResponse.data[i];
    const next = communitiesResponse.data[i + 1];
    TestValidator.predicate(
      `subscriber_count descending order: ${current.subscriber_count} >= ${next.subscriber_count}`,
      current.subscriber_count >= next.subscriber_count,
    );
  }
}
