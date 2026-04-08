import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_feed_community_new_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest authentication - create actor-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(guestAuth);
  // 2. Create actor-specific connection with token for authenticated requests
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: guestAuth.token.access,
    },
  };
  // 3. Get community ID (assuming pre-existing community for testing)
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Fetch community feed with sort="new" (created_at DESC ordering)
  const response: IPageIRedditCommunityPost.ISummary =
    await api.functional.redditCommunity.guest.feeds.community.index(
      authenticatedConnection,
      {
        communityId,
        body: {
          sort: "new" as const,
          pageSize: 20,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(response);
  // 5. Validate pagination metadata structure
  TestValidator.equals("current page", response.pagination.current, 1);
  TestValidator.equals("limit", response.pagination.limit, 20);
  TestValidator.predicate("pages is valid", response.pagination.pages >= 0);
  TestValidator.predicate("records is valid", response.pagination.records >= 0);
  // 6. Validate posts are sorted by created_at DESC (newest first)
  const posts = response.data;
  if (posts.length > 1) {
    for (let i = 0; i < posts.length - 1; i++) {
      const current = posts[i];
      const next = posts[i + 1];
      TestValidator.predicate(
        `post ${i} is newer or equal than post ${i + 1}`,
        new Date(current.created_at).getTime() >=
          new Date(next.created_at).getTime(),
      );
    }
  }
  // 7. Validate all posts belong to the specified community
  for (const post of posts) {
    typia.assert(post);
    TestValidator.equals(
      "community id matches",
      post.community.id,
      communityId,
    );
  }
  // 8. Validate post metadata structure and types
  for (const post of posts) {
    typia.assert(post);
    // Validate required string fields
    TestValidator.notEquals("has id", post.id, null);
    TestValidator.notEquals("has title", post.title, null);
    // Validate post_type is one of the allowed values
    TestValidator.predicate(
      "post_type is valid",
      ["text", "link", "image"].includes(post.post_type),
    );
    // Validate numeric fields
    TestValidator.predicate(
      "vote_score is number",
      typeof post.vote_score === "number",
    );
    TestValidator.predicate(
      "comment_count is number",
      typeof post.comment_count === "number",
    );
    // Validate date-time fields exist and are strings
    TestValidator.notEquals("has created_at", post.created_at, null);
    TestValidator.notEquals("has updated_at", post.updated_at, null);
    typia.assert(post.created_at);
    typia.assert(post.updated_at);
    // Validate author exists and has required fields
    typia.assert(post.author);
    TestValidator.notEquals("author has id", post.author.id, null);
    TestValidator.notEquals("author has username", post.author.username, null);
    typia.assert(post.author.created_at);
    typia.assert(post.author.updated_at);
    // Validate community exists and has required fields
    typia.assert(post.community);
    TestValidator.notEquals("community has id", post.community.id, null);
    TestValidator.notEquals("community has name", post.community.name, null);
    typia.assert(post.community.created_at);
  }
  // 9. Validate no soft-deleted posts in results (deleted_at should be null)
  for (const post of posts) {
    typia.assert(post);
    TestValidator.equals("post not deleted", post.deleted_at, null);
  }
}
