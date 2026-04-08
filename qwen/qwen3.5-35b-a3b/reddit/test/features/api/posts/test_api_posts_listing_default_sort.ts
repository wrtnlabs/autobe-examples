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

export async function test_api_posts_listing_default_sort(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const postsResponse = await api.functional.redditPlatform.member.posts.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(postsResponse);
  const { pagination, data } = postsResponse;
  typia.assert(pagination);
  typia.assert(data);
  TestValidator.equals("current page is 1", pagination.current, 1);
  TestValidator.equals("limit is 20", pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate("pages count is non-negative", pagination.pages >= 0);
  if (pagination.records > 0) {
    const expectedPages = Math.ceil(pagination.records / pagination.limit);
    TestValidator.equals(
      "pages calculated correctly",
      pagination.pages,
      expectedPages,
    );
  }
  for (let i = 0; i < data.length; i++) {
    const post = data[i];
    typia.assert(post);
    TestValidator.equals("post has id", typeof post.id, "string");
    TestValidator.equals("post has title", typeof post.title, "string");
    TestValidator.equals("post has post_type", typeof post.post_type, "string");
    TestValidator.predicate(
      "upvotes_count is number",
      typeof post.upvotes_count === "number",
    );
    TestValidator.predicate(
      "downvotes_count is number",
      typeof post.downvotes_count === "number",
    );
    TestValidator.predicate(
      "comment_count is number",
      typeof post.comment_count === "number",
    );
    typia.assert(post.author);
    TestValidator.equals("author has id", typeof post.author.id, "string");
    TestValidator.equals(
      "author has username",
      typeof post.author.username,
      "string",
    );
    TestValidator.predicate(
      "author has karma",
      typeof post.author.karma === "number",
    );
    TestValidator.equals(
      "author has created_at",
      typeof post.author.created_at,
      "string",
    );
    typia.assert(post.community);
    TestValidator.equals(
      "community has id",
      typeof post.community.id,
      "string",
    );
    TestValidator.equals(
      "community has name",
      typeof post.community.name,
      "string",
    );
    TestValidator.predicate(
      "community has subscriber_count",
      typeof post.community.subscriber_count === "number",
    );
    typia.assert(post.community.owner);
    TestValidator.equals(
      "community owner has id",
      typeof post.community.owner.id,
      "string",
    );
    TestValidator.equals(
      "community owner has username",
      typeof post.community.owner.username,
      "string",
    );
    TestValidator.equals(
      "community has created_at",
      typeof post.community.created_at,
      "string",
    );
    TestValidator.equals(
      "community has updated_at",
      typeof post.community.updated_at,
      "string",
    );
    TestValidator.predicate(
      "community has deleted_at",
      post.community.deleted_at === null ||
        typeof post.community.deleted_at === "string",
    );
    TestValidator.equals(
      "post has created_at",
      typeof post.created_at,
      "string",
    );
    TestValidator.equals(
      "post has updated_at",
      typeof post.updated_at,
      "string",
    );
    TestValidator.predicate(
      "post has deleted_at",
      post.deleted_at === null || typeof post.deleted_at === "string",
    );
    if (i + 1 < data.length) {
      const nextPost = data[i + 1];
      TestValidator.predicate(
        "posts are sorted by created_at DESC",
        new Date(post.created_at) >= new Date(nextPost.created_at),
      );
    }
  }
}