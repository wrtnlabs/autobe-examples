import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_home_feed_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create test member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditLike.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: null,
        avatar_url: null,
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(member);
  // Execute: Get home feed (no authentication required per spec)
  const feed =
    await api.functional.redditLike.member.feed.home.search(memberConnection);
  typia.assert(feed);
  // Validate: Check pagination structure
  TestValidator.equals(
    "pagination has current page",
    feed.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is set",
    feed.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination records count",
    feed.pagination.records >= 0,
    true,
  );
  // Validate: All posts contain required fields
  feed.data.forEach((post) => {
    TestValidator.equals("post has id", typeof post.id, "string");
    TestValidator.equals("post has title", typeof post.title, "string");
    TestValidator.predicate("post has author", post.author !== undefined);
    TestValidator.predicate("post has community", post.community !== undefined);
    TestValidator.equals("post has score", typeof post.score, "number");
    TestValidator.equals(
      "post has comment_count",
      typeof post.comment_count,
      "number",
    );
    TestValidator.predicate("post has created_at", post.created_at !== undefined);
  });
  // Validate: If posts exist, verify structure
  if (feed.data.length > 0) {
    const post = feed.data[0];
    TestValidator.predicate(
      "post id is UUID format",
      /^[0-9a-f-]{36}$/i.test(post.id),
    );
    TestValidator.equals("author has id", typeof post.author.id, "string");
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
  }
}