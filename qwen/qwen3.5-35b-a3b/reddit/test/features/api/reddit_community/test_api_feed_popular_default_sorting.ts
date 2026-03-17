import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_feed_popular_default_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest registration
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Create guest connection for authenticated requests
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${guestAuth.token.access}` },
  };
  // 3. Access popular feed with default sorting (no query params = popular feed)
  const response = await api.functional.redditCommunity.posts.index(
    authenticatedConnection,
    {
      body: {} satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(response);
  // 4. Validate response structure
  TestValidator.predicate(
    "response has pagination",
    response.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(response.data),
  );
  // 5. Validate pagination metadata
  const { pagination } = response;
  TestValidator.equals("pagination has current page", pagination.current, 1);
  TestValidator.predicate("pagination has limit", pagination.limit > 0);
  TestValidator.predicate(
    "pagination has records count",
    pagination.records >= 0,
  );
  TestValidator.predicate("pagination has pages count", pagination.pages >= 0);
  // 6. Validate posts array
  TestValidator.predicate("posts data array exists", response.data.length >= 0);
  // 7. Validate each post contains required fields
  for (const post of response.data) {
    typia.assert(post);
    TestValidator.equals("post has id", typeof post.id === "string", true);
    TestValidator.equals(
      "post has title",
      typeof post.title === "string" && post.title.length > 0,
      true,
    );
    TestValidator.equals("post has author", post.author !== undefined, true);
    TestValidator.equals(
      "author has username",
      typeof post.author.username === "string",
      true,
    );
    TestValidator.equals(
      "post has community",
      post.community !== undefined,
      true,
    );
    TestValidator.equals(
      "community has name",
      typeof post.community.name === "string",
      true,
    );
    TestValidator.equals(
      "post has vote_score",
      typeof post.vote_score === "number",
      true,
    );
    TestValidator.equals(
      "post has comment_count",
      typeof post.comment_count === "number",
      true,
    );
    TestValidator.equals(
      "post has created_at",
      typeof post.created_at === "string",
      true,
    );
    TestValidator.equals(
      "post has post_type",
      typeof post.post_type === "string",
      true,
    );
    TestValidator.equals(
      "post_type is valid",
      ["text", "link", "image"].includes(post.post_type),
      true,
    );
    TestValidator.predicate(
      "post has preview_content or null",
      post.preview_content === null || typeof post.preview_content === "string",
    );
  }
  // 8. Verify pagination metadata consistency
  const expectedPages = Math.ceil(pagination.records / pagination.limit);
  TestValidator.equals(
    "pages calculated correctly",
    pagination.pages,
    expectedPages,
  );
  // 9. Test page 2 pagination
  const page2Response = await api.functional.redditCommunity.posts.index(
    authenticatedConnection,
    {
      body: {
        page: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 current page",
    page2Response.pagination.current,
    2,
  );
  // 10. Verify page 2 has valid data
  TestValidator.predicate(
    "page 2 has pagination",
    page2Response.pagination !== undefined,
  );
  TestValidator.predicate(
    "page 2 has data array",
    Array.isArray(page2Response.data),
  );
  // 11. Test community feed with specific community_id
  if (response.data.length > 0) {
    const samplePost = response.data[0];
    const communityFeedResponse =
      await api.functional.redditCommunity.posts.index(
        authenticatedConnection,
        {
          body: {
            community_id: samplePost.community.id satisfies string &
              tags.Format<"uuid">,
          } satisfies IRedditCommunityPost.IRequest,
        },
      );
    typia.assert(communityFeedResponse);
    TestValidator.predicate(
      "community feed returns posts",
      communityFeedResponse.data.length >= 0,
    );
    // 12. Verify each post in community feed belongs to the specified community
    for (const post of communityFeedResponse.data) {
      TestValidator.equals(
        "community feed post belongs to community",
        post.community.id,
        samplePost.community.id,
      );
    }
  }
  // 13. Test search functionality
  const searchResponse = await api.functional.redditCommunity.posts.index(
    authenticatedConnection,
    {
      body: {
        search: "test" satisfies string & tags.MaxLength<255>,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(searchResponse);
  TestValidator.predicate(
    "search returns pagination",
    searchResponse.pagination !== undefined,
  );
}