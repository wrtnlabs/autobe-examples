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

export async function test_api_community_feed_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Use random communityId (can't create communities with available SDK)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve community feed
  const feed = await api.functional.redditPlatform.member.feeds.community.index(
    memberConnection,
    {
      communityId,
      body: {
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(feed);
  // 4. Validate response structure
  TestValidator.equals(
    "pagination structure has required fields",
    {
      current: feed.pagination.current,
      limit: feed.pagination.limit,
      records: feed.pagination.records,
      pages: feed.pagination.pages,
    } satisfies Partial<IPage.IPagination>,
    {
      current: 1,
      limit: 20,
      records: 0,
      pages: 0,
    } satisfies Partial<IPage.IPagination>,
  );
  // 5. Validate pagination metadata
  TestValidator.equals("current page is 1", feed.pagination.current, 1);
  TestValidator.equals("limit is 20", feed.pagination.limit, 20);
  TestValidator.equals(
    "total records is 0 (empty community)",
    feed.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages is 0 (empty community)",
    feed.pagination.pages,
    0,
  );
  // 6. Validate data array structure
  TestValidator.equals("posts count is 0", feed.data.length, 0);
  // 7. Validate post summary structure (with sample data)
  if (feed.data.length > 0) {
    const samplePost = feed.data[0];
    typia.assert(samplePost);
    TestValidator.predicate("post has author", samplePost.author !== null);
    TestValidator.predicate(
      "author has id",
      samplePost.author.id !== undefined,
    );
    TestValidator.predicate(
      "author has username",
      samplePost.author.username !== undefined,
    );
    TestValidator.predicate(
      "author has displayName",
      samplePost.author.displayName !== undefined,
    );
    TestValidator.predicate(
      "post has community",
      samplePost.community !== null,
    );
    TestValidator.predicate(
      "community has id",
      samplePost.community.id !== undefined,
    );
    TestValidator.predicate(
      "community has name",
      samplePost.community.name !== undefined,
    );
    TestValidator.predicate(
      "community has subscriber_count",
      samplePost.community.subscriber_count !== undefined,
    );
    TestValidator.predicate("post has id", samplePost.id !== undefined);
    TestValidator.predicate("post has title", samplePost.title !== undefined);
    TestValidator.predicate(
      "post has post_type",
      samplePost.post_type !== undefined,
    );
    TestValidator.predicate(
      "post has vote_score",
      samplePost.vote_score !== undefined,
    );
    TestValidator.predicate(
      "post has comment_count",
      samplePost.comment_count !== undefined,
    );
    TestValidator.predicate(
      "post has created_at",
      samplePost.created_at !== undefined,
    );
    TestValidator.predicate(
      "post has deleted_at",
      samplePost.deleted_at !== undefined,
    );
  }
}