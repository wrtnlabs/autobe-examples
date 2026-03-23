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

export async function test_api_community_list_with_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    },
  });
  // 2. Create multiple test communities
  const numCommunities = 25;
  const createdCommunities: IRedditLikeCommunity[] = [];
  for (let i = 0; i < numCommunities; i++) {
    const community =
      await generate_random_reddit_like_member_communities_create(
        memberConnection,
        {
          body: {
            name: `community_${RandomGenerator.alphaNumeric(8)}`,
            icon_url:
              i % 3 === 0
                ? RandomGenerator.substring("https://example.com/icon.png")
                : undefined,
          },
        },
      );
    typia.assert(community);
    createdCommunities.push(community);
  }
  // 3. Verify default pagination (page=1, limit=20, sorted by subscriber_count desc)
  const response = await api.functional.redditLike.communities.index(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(response);
  // 4. Validate pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 20", response.pagination.limit, 20);
  TestValidator.equals(
    "total records is 25",
    response.pagination.records,
    numCommunities,
  );
  TestValidator.equals("total pages is 2", response.pagination.pages, 2);
  // 5. Validate data array has 20 communities
  TestValidator.equals("data length is 20", response.data.length, 20);
  // 6. Validate communities are sorted by subscriber_count descending
  for (let i = 0; i < response.data.length - 1; i++) {
    TestValidator.predicate(
      `community ${i} >= community ${i + 1}`,
      response.data[i].subscriber_count >=
        response.data[i + 1].subscriber_count,
    );
  }
  // 7. Validate community summary structure
  response.data.forEach((community) => {
    TestValidator.equals("name exists", typeof community.name, "string");
    TestValidator.equals(
      "icon_url exists",
      typeof community.icon_url,
      "string",
    );
    TestValidator.predicate(
      "subscriber_count is non-negative",
      community.subscriber_count >= 0,
    );
  });
  // 8. Test second page
  const page2Response = await api.functional.redditLike.communities.index(
    memberConnection,
    {
      body: { page: 2, limit: 20 },
    },
  );
  typia.assert(page2Response);
  TestValidator.equals("page 2 data length is 5", page2Response.data.length, 5);
  TestValidator.equals(
    "page 2 current is 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 records is 25",
    page2Response.pagination.records,
    numCommunities,
  );
}
