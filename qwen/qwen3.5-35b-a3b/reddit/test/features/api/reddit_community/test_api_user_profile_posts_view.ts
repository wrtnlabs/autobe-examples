import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_user_profile_posts_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member user (test user)
  const authUserConnection: api.IConnection = { host: connection.host };
  const authUserResponse = await authorize_member_join(authUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testpassword123",
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authUserResponse);
  // 2. Create target user (user whose posts we'll view)
  const targetUserConnection: api.IConnection = { host: connection.host };
  const targetUserResponse = await authorize_member_join(targetUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testpassword456",
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(targetUserResponse);
  // 3. Generate target user ID (UUID format)
  const targetUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Fetch target user's posts using authUser's connection (with JWT token)
  const postsResponse =
    await api.functional.redditCommunity.member.users.posts.index(
      authUserConnection,
      {
        userId: targetUserId,
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(postsResponse);
  // 5. Validate pagination metadata
  const pagination = postsResponse.pagination;
  TestValidator.predicate(
    "pagination current is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );
  // 6. Validate post summaries structure
  for (const post of postsResponse.data) {
    // Validate author structure
    TestValidator.equals("author has id", post.author.id !== undefined, true);
    TestValidator.equals(
      "author has username",
      post.author.username !== undefined,
      true,
    );
    TestValidator.equals(
      "author has created_at",
      post.author.created_at !== undefined,
      true,
    );
    // Validate community structure
    TestValidator.equals(
      "community has id",
      post.community.id !== undefined,
      true,
    );
    TestValidator.equals(
      "community has name",
      post.community.name !== undefined,
      true,
    );
    TestValidator.equals(
      "community has subscriber_count",
      post.community.subscriber_count !== undefined,
      true,
    );
    // Validate vote_score is integer
    TestValidator.predicate(
      "vote_score is integer",
      Number.isInteger(post.vote_score),
    );
    // Validate comment_count is non-negative
    TestValidator.predicate(
      "comment_count is non-negative",
      post.comment_count >= 0,
    );
    // Validate post_type is valid enum value
    const validTypes = ["text", "link", "image"] as const;
    TestValidator.predicate(
      "post_type is valid enum value",
      validTypes.includes(post.post_type),
    );
    // Validate created_at is valid date-time string
    TestValidator.predicate(
      "created_at is valid date-time",
      !isNaN(Date.parse(post.created_at)),
    );
  }
  // 7. Validate chronological ordering (reverse chronological = most recent first)
  if (postsResponse.data.length >= 2) {
    for (let i = 1; i < postsResponse.data.length; i++) {
      const prevPost = postsResponse.data[i - 1];
      const currPost = postsResponse.data[i];
      TestValidator.predicate(
        `posts are reverse chronologically ordered at index ${i}`,
        new Date(currPost.created_at).getTime() <=
          new Date(prevPost.created_at).getTime(),
      );
    }
  }
  // 8. Validate pagination consistency
  TestValidator.predicate(
    "pagination records matches data length",
    pagination.records >= postsResponse.data.length,
  );
  TestValidator.predicate(
    "pagination pages is calculated correctly",
    pagination.pages === Math.ceil(pagination.records / pagination.limit) ||
      (pagination.records === 0 && pagination.pages === 0),
  );
}
