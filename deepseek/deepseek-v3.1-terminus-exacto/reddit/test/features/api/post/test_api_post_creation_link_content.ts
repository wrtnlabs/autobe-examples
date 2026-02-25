import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

/**
 * Test successful creation of a link post with valid URL.
 * Validates that the URL is properly formatted and that domain information
 * is extracted correctly. Verifies that the post includes appropriate
 * link metadata and that the content preview displays the domain name
 * correctly. Ensures that link posts follow the same engagement tracking
 * as other post types with proper vote and comment counters.
 */
export async function test_api_post_creation_link_content(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate a user
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {});
  typia.assert(authorizedUser);
  userConnection.headers = { Authorization: authorizedUser.token.access };
  // Step 2: Create a community for the post
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Create a link post
  const linkPostBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    community_name: community.name,
    post_type: "link" as const,
    link_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    { body: linkPostBody },
  );
  typia.assert(post);
  // Step 4: Validations
  TestValidator.equals("post_type should be 'link'", post.post_type, "link");
  TestValidator.equals(
    "community matches",
    post.community.name,
    community.name,
  );
  TestValidator.equals("author matches", post.author.id, authorizedUser.id);
  TestValidator.equals("title matches", post.title, linkPostBody.title);
  // Validate URL domain extraction using regex
  const url = new URL(linkPostBody.link_url);
  TestValidator.predicate("domain should be extracted", () => {
    return (
      post.title.includes(url.hostname) ||
      post.community.description.includes(url.hostname)
    );
  });
  // Validate engagement counters
  TestValidator.equals(
    "votes_count should initialize to zero",
    post.votes_count,
    0,
  );
  TestValidator.equals(
    "comments_count should initialize to zero",
    post.comments_count,
    0,
  );
  // Validate timestamps
  TestValidator.predicate("created_at should be recent", () => {
    const postDate = new Date(post.created_at);
    const now = new Date();
    return Math.abs(now.getTime() - postDate.getTime()) < 60000; // Within 1 minute
  });
  TestValidator.predicate(
    "updated_at should equal created_at initially",
    () => {
      return post.updated_at === post.created_at;
    },
  );
  // Validate post structure
  TestValidator.predicate("post should have id", () => post.id.length > 0);
  TestValidator.predicate(
    "post should have author with karma",
    () => post.author.karma >= 0,
  );
  TestValidator.predicate(
    "deleted_at should be null",
    () => post.deleted_at === null,
  );
}
