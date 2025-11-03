import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

const uri = RandomGenerator.paragraph({
  sentences: 1,
  wordMin: 10,
  wordMax: 20,
});

export async function test_api_post_creation_by_user_in_community(
  connection: api.IConnection,
) {
  // 1. User registration
  const user_email = typia.random<string & tags.Format<"email">>();
  const join_response = await api.functional.auth.user.join(connection, {
    body: {
      email: user_email,
      password: "Password1234!",
      href: uri,
      referrer: uri,
    } satisfies IRedditCommunityUser.ICreate,
  });
  typia.assert(join_response);

  // 2. User login
  const login_response = await api.functional.auth.user.login(connection, {
    body: {
      email: user_email,
      password: "Password1234!",
      href: uri,
      referrer: uri,
    } satisfies IRedditCommunityUser.ILogin,
  });
  typia.assert(login_response);

  // 3. Create a community
  const community_name = RandomGenerator.name(1)
    .toLowerCase()
    .replace(/\s+/g, "_");
  const community_description = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 10,
  });
  const community =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: {
        name: community_name,
        description: community_description,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // 4. Create a post in the community
  const content_type_id = typia.random<string & tags.Format<"uuid">>();
  const title = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const body = RandomGenerator.content({ paragraphs: 3 });
  const image_uri = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 10,
    wordMax: 20,
  });
  const status = "active";

  const post =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName: community.name,
        body: {
          reddit_community_content_type_id: content_type_id,
          title: title,
          body: body,
          image_uri: image_uri,
          status: status,
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  typia.assert(post);

  TestValidator.equals("post title matches input", post.title, title);
  TestValidator.equals("post body matches input", post.body, body);
  TestValidator.equals(
    "post image_uri matches input",
    post.image_uri ?? null,
    image_uri,
  );
  TestValidator.equals("post status is active", post.status, "active");
  TestValidator.equals(
    "post community matches created community",
    post.reddit_community_community_id,
    community.id,
  );
  TestValidator.equals(
    "post user matches authenticated user",
    post.reddit_community_user_id,
    login_response.id,
  );
}
