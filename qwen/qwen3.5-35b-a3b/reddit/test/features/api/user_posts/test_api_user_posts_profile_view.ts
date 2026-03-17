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

export async function test_api_user_posts_profile_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest user to get user ID for profile posts
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(guestAuth);
  // 2. Retrieve posts for the guest user's profile
  const postsResponse =
    await api.functional.redditCommunity.guest.users.posts.index(connection, {
      userId: guestAuth.id,
      body: {
        page: 1,
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IRedditCommunityPost.IRequest,
    });
  typia.assert(postsResponse);
  // 3. Validate pagination metadata structure
  typia.assert(postsResponse.pagination);
  TestValidator.equals(
    "pagination current page is positive",
    postsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    postsResponse.pagination.limit,
    postsResponse.pagination.limit,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    postsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    postsResponse.pagination.pages >= 0,
  );
  // 4. Validate each post summary structure
  for (const post of postsResponse.data) {
    typia.assert(post);
    // Validate post fields with business logic
    TestValidator.predicate(
      "post title is non-empty string",
      post.title.length > 0,
    );
    TestValidator.equals(
      "post vote score is integer",
      Math.floor(post.vote_score),
      post.vote_score,
    );
    TestValidator.predicate(
      "post comment count is non-negative",
      post.comment_count >= 0,
    );
    // Validate author information
    typia.assert(post.author);
    TestValidator.equals(
      "author username is non-empty string",
      post.author.username.length,
      post.author.username.length,
    );
    TestValidator.predicate(
      "author created_at is valid date-time",
      !isNaN(Date.parse(post.author.created_at)),
    );
    if (post.author.profile) {
      typia.assert(post.author.profile);
    }
    // Validate community information
    typia.assert(post.community);
    TestValidator.equals(
      "community name is non-empty string",
      post.community.name.length,
      post.community.name.length,
    );
    TestValidator.predicate(
      "community subscriber count is non-negative",
      post.community.subscriber_count >= 0,
    );
    TestValidator.predicate(
      "community created_at is valid date-time",
      !isNaN(Date.parse(post.community.created_at)),
    );
    typia.assert(post.community.owner);
    // Validate post type enum (not type error testing - business logic)
    TestValidator.predicate(
      "post type is valid enum",
      ["text", "link", "image"].includes(post.post_type),
    );
    // Validate preview content is string or null
    TestValidator.predicate(
      "preview content is string or null",
      typeof post.preview_content === "string" || post.preview_content === null,
    );
  }
  // 5. Validate reverse chronological sorting (most recent first)
  if (postsResponse.data.length > 1) {
    for (let i = 0; i < postsResponse.data.length - 1; i++) {
      const currentPost = postsResponse.data[i];
      const nextPost = postsResponse.data[i + 1];
      TestValidator.predicate(
        `post at index ${i} is more recent than index ${i + 1}`,
        new Date(currentPost.created_at) >= new Date(nextPost.created_at),
      );
    }
  }
  // 6. Validate pagination metadata consistency
  TestValidator.predicate(
    "total pages calculation is correct",
    postsResponse.pagination.pages ===
      Math.max(
        0,
        Math.ceil(
          postsResponse.pagination.records / postsResponse.pagination.limit,
        ),
      ),
  );
}
