import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

export async function test_api_community_list_with_varied_sort_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  // 2. Create test communities with varied subscriber counts
  const communities: IRedditLikeCommunity[] = [];
  for (let i = 0; i < 5; i++) {
    const community =
      await generate_random_reddit_like_member_communities_create(
        memberConnection,
        {
          body: {
            name: `test_community_${i}_${RandomGenerator.alphaNumeric(6)}`,
          } satisfies IRedditLikeCommunity.ICreate,
        },
      );
    typia.assert(community);
    communities.push(community);
  }
  // 3. Test default sorting (subscriber_count descending)
  const defaultResponse = await api.functional.redditLike.communities.index(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(defaultResponse);
  TestValidator.predicate("has communities", defaultResponse.data.length > 0);
  // 4. Test subscriber_count ascending
  const ascSubscriberResponse =
    await api.functional.redditLike.communities.index(memberConnection, {
      body: {
        sort: "subscriber_count",
      },
    });
  typia.assert(ascSubscriberResponse);
  TestValidator.predicate(
    "ascending subscriber count order",
    ascSubscriberResponse.data.every(
      (community, i, arr) =>
        i === 0 || arr[i - 1].subscriber_count <= community.subscriber_count,
    ),
  );
  // 5. Test subscriber_count descending
  const descSubscriberResponse =
    await api.functional.redditLike.communities.index(memberConnection, {
      body: {
        sort: "subscriber_count_desc",
      },
    });
  typia.assert(descSubscriberResponse);
  TestValidator.predicate(
    "descending subscriber count order",
    descSubscriberResponse.data.every(
      (community, i, arr) =>
        i === 0 || arr[i - 1].subscriber_count >= community.subscriber_count,
    ),
  );
  // 6. Test pagination with sorting
  const paginatedResponse = await api.functional.redditLike.communities.index(
    memberConnection,
    {
      body: {
        sort: "subscriber_count_desc",
        page: 1,
        limit: 2,
      },
    },
  );
  typia.assert(paginatedResponse);
  TestValidator.equals("pagination limit", paginatedResponse.data.length, 2);
  TestValidator.equals(
    "pagination page",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "has pagination info",
    paginatedResponse.pagination.records >= 0,
  );
}
