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

export async function test_api_post_creation_text_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAuth);
  // 2. Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create text post with minimum content requirements
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    community_name: community.name,
    post_type: "text" as const,
    text_content: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: postBody,
    },
  );
  typia.assert(post);
  // 4. Validate post creation
  TestValidator.equals("post type is text", post.post_type, "text");
  TestValidator.equals("post title matches", post.title, postBody.title);
  TestValidator.equals("community matches", post.community.id, community.id);
  TestValidator.equals("author matches", post.author.id, userAuth.id);
  TestValidator.equals("votes count initialized to zero", post.votes_count, 0);
  TestValidator.equals(
    "comments count initialized to zero",
    post.comments_count,
    0,
  );
  TestValidator.predicate(
    "text content meets minimum length",
    postBody.text_content!.length >= 10,
  );
  TestValidator.predicate(
    "author has valid karma",
    typeof userAuth.karma === "number",
  );
  TestValidator.predicate(
    "post has creation timestamp",
    typeof post.created_at === "string",
  );
  TestValidator.predicate(
    "post has update timestamp",
    typeof post.updated_at === "string",
  );
  TestValidator.predicate(
    "post has valid ID",
    typeof post.id === "string" && post.id.length > 0,
  );
}
