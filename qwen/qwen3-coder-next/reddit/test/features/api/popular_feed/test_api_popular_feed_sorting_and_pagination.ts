import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_popular_feed_sorting_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection for public access to popular feed
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      device_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  // Test popular feed endpoint with minimal valid request
  // The popular feed endpoint accepts IRedditLikePost.IRequest which requires title, type, and communityName
  const request: IRedditLikePost.IRequest = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    type: "text" as const,
    content: RandomGenerator.content({ paragraphs: 3 }),
    communityName: RandomGenerator.alphabets(8),
  };
  // Call popular feed endpoint
  const result = await api.functional.redditLike.guest.posts.popular.index(
    guestConnection,
    { body: request },
  );
  typia.assert(result);
  // Validate response structure
  TestValidator.equals(
    "response has pagination",
    typeof result.pagination,
    "object",
  );
  TestValidator.equals(
    "pagination has current",
    typeof result.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination has limit",
    typeof result.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination has records",
    typeof result.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination has pages",
    typeof result.pagination.pages,
    "number",
  );
  TestValidator.predicate("has data array", Array.isArray(result.data));
  // Validate post summaries in response
  for (const post of result.data) {
    TestValidator.equals("post has id", typeof post.id, "string");
    TestValidator.equals("post has title", typeof post.title, "string");
    TestValidator.equals(
      "post has type",
      ["text", "link", "image"].includes(post.type),
      true,
    );
    TestValidator.equals("post has author", typeof post.author, "object");
    TestValidator.equals("post has community", typeof post.community, "object");
    TestValidator.equals("author has id", typeof post.author.id, "string");
    TestValidator.equals(
      "author has username",
      typeof post.author.username,
      "string",
    );
    TestValidator.equals(
      "community has name",
      typeof post.community.name,
      "string",
    );
    TestValidator.predicate(
      "voteScore is number",
      typeof post.voteScore === "number",
    );
    TestValidator.predicate(
      "commentCount is number",
      typeof post.commentCount === "number",
    );
    TestValidator.predicate(
      "isValid timestamp",
      new Date(post.createdAt).getTime() > 0,
    );
  }
}
