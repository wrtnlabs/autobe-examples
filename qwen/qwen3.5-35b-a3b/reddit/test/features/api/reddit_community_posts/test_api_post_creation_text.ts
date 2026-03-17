import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_post_creation_text(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuthorized);
  // Step 2: Create a text post in a community
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // Step 3: Validate post creation response
  TestValidator.equals("post type is text", post.post_type, "text");
  TestValidator.equals("vote score is 0", post.vote_score, 0);
  TestValidator.equals("comment count is 0", post.comment_count, 0);
  TestValidator.notEquals("post id is valid", post.id, "");
  TestValidator.notEquals("post title is valid", post.title, "");
  TestValidator.predicate(
    "post title length within limit",
    post.title.length <= 300,
  );
  TestValidator.notEquals("created_at is valid date-time", post.created_at, "");
  TestValidator.notEquals("updated_at is valid date-time", post.updated_at, "");
  TestValidator.predicate("author id is valid", post.author.id !== "");
  TestValidator.notEquals("author username is valid", post.author.username, "");
  TestValidator.notEquals(
    "author created_at is valid",
    post.author.created_at,
    "",
  );
  TestValidator.predicate("community id is valid", post.community.id !== "");
  TestValidator.notEquals("community name is valid", post.community.name, "");
  TestValidator.predicate(
    "community description is string or null",
    typeof post.community.description === "string" ||
      post.community.description === null,
  );
  TestValidator.predicate(
    "community subscriber count is valid",
    post.community.subscriber_count >= 0,
  );
  TestValidator.notEquals(
    "author in community owner",
    post.community.owner.id,
    "",
  );
  // Validate content object for text post
  if (post.content.post_type === "text") {
    TestValidator.notEquals("content body is valid", post.content.body, "");
  }
  TestValidator.equals(
    "deleted_at is null for active post",
    post.deleted_at,
    null,
  );
  // Verify created_at is recent (within last 10 seconds)
  const createdDate = new Date(post.created_at);
  const now = new Date();
  const diffMs = now.getTime() - createdDate.getTime();
  TestValidator.predicate(
    "created_at is recent",
    diffMs >= 0 && diffMs <= 10000,
  );
  // Verify updated_at matches created_at for new post
  TestValidator.equals(
    "updated_at equals created_at on new post",
    post.updated_at,
    post.created_at,
  );
}
