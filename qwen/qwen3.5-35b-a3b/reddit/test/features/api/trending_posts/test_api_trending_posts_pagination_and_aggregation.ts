import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
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

export async function test_api_trending_posts_pagination_and_aggregation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create test members (Admin + 5 members)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminOutput = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username:
        RandomGenerator.alphaNumeric(8) + RandomGenerator.alphaNumeric(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(adminOutput);
  const members: IRedditPlatformMember.IAuthorized[] = [];
  for (let i = 0; i < 5; i++) {
    const memberConnection: api.IConnection = { host: connection.host };
    const memberOutput = await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        username: RandomGenerator.alphaNumeric(8) + i,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformMember.IJoin,
    });
    typia.assert(memberOutput);
    members.push(memberOutput);
  }
  // Note: The scenario requires communities, posts, votes, and comments creation
  // which are not available via provided SDK functions. We test pagination
  // and aggregation validation with available data.
  // 2. Test pagination page 1
  const page1Connection: api.IConnection = { host: connection.host };
  const page1Response =
    await api.functional.redditPlatform.member.trending.posts.index(
      page1Connection,
      {
        body: {
          page: 1,
          limit: 5,
          sort: "hot",
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(page1Response);
  TestValidator.equals("page 1 data count", page1Response.data.length, 5);
  TestValidator.equals(
    "page 1 pagination current",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 pagination limit",
    page1Response.pagination.limit,
    5,
  );
  TestValidator.equals(
    "page 1 pagination records",
    page1Response.pagination.records,
    25,
  );
  TestValidator.equals(
    "page 1 pagination pages",
    page1Response.pagination.pages,
    5,
  );
  // 3. Test pagination page 2
  const page2Connection: api.IConnection = { host: connection.host };
  const page2Response =
    await api.functional.redditPlatform.member.trending.posts.index(
      page2Connection,
      {
        body: {
          page: 2,
          limit: 5,
          sort: "hot",
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals("page 2 data count", page2Response.data.length, 5);
  TestValidator.equals(
    "page 2 pagination current",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 pagination pages",
    page2Response.pagination.pages,
    5,
  );
  // 4. Test pagination page 5 (last page)
  const page5Connection: api.IConnection = { host: connection.host };
  const page5Response =
    await api.functional.redditPlatform.member.trending.posts.index(
      page5Connection,
      {
        body: {
          page: 5,
          limit: 5,
          sort: "hot",
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(page5Response);
  TestValidator.equals("page 5 data count", page5Response.data.length, 5);
  TestValidator.equals(
    "page 5 pagination current",
    page5Response.pagination.current,
    5,
  );
  // 5. Test pagination page 6 (empty)
  const page6Connection: api.IConnection = { host: connection.host };
  const page6Response =
    await api.functional.redditPlatform.member.trending.posts.index(
      page6Connection,
      {
        body: {
          page: 6,
          limit: 5,
          sort: "hot",
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(page6Response);
  TestValidator.equals(
    "page 6 data count (should be empty)",
    page6Response.data.length,
    0,
  );
  TestValidator.equals(
    "page 6 pagination current",
    page6Response.pagination.current,
    6,
  );
  // 6. Validate aggregation metrics on returned posts
  for (const post of page1Response.data) {
    typia.assert(post);
    TestValidator.predicate(
      "upvotes_count is non-negative",
      post.upvotes_count >= 0,
    );
    TestValidator.predicate(
      "downvotes_count is non-negative",
      post.downvotes_count >= 0,
    );
    TestValidator.predicate(
      "comment_count is non-negative",
      post.comment_count >= 0,
    );
    TestValidator.predicate("post has valid author", post.author !== undefined);
    TestValidator.predicate(
      "post has valid community",
      post.community !== undefined,
    );
    TestValidator.predicate(
      "community has subscriber count",
      post.community.subscriber_count >= 0,
    );
  }
}