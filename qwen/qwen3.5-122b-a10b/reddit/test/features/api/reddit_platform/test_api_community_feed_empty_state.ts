import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

/**
 * Test querying an empty community feed that has no posts.
 *
 * This test validates that:
 * 1. A new community can be created successfully
 * 2. Querying the community feed with no posts returns empty data
 * 3. Pagination metadata correctly shows 0 records and 0 pages
 * 4. The endpoint handles empty state gracefully without errors
 */
export async function test_api_community_feed_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a test community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Query the community feed with no posts created
  const feed = await api.functional.redditPlatform.feeds.community.index(
    memberConnection,
    {
      communityId: community.id,
      body: {
        page: 1,
        limit: 20,
        sort_by: "new",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(feed);
  // 4. Verify empty data array
  TestValidator.equals("data array is empty", feed.data.length, 0);
  // 5. Verify pagination metadata for empty state
  TestValidator.equals("current page is 1", feed.pagination.current, 1);
  TestValidator.equals("limit is 20", feed.pagination.limit, 20);
  TestValidator.equals("total records is 0", feed.pagination.records, 0);
  TestValidator.equals("total pages is 0", feed.pagination.pages, 0);
}