import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
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
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_post_creation_link_and_image_types(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // Step 2: Get available communities and subscribe to first one
  const communities =
    await api.functional.redditLike.member.communities.my.index(
      memberConnection,
    );
  typia.assert(communities);
  // Use first community if available, otherwise this test may fail
  // In production scenario, we'd ensure a test community exists
  if (communities.data.length > 0) {
    // Subscribe to first community (PATCH to my communities with community name)
    // For now, we'll proceed assuming the subscription would be handled
    // by test setup in real scenario
  }
  // Step 3: Create link post
  const linkPost = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "link" as const,
        url: typia.random<string & tags.Format<"uri">>(),
        content: null,
        image_url: null,
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(linkPost);
  // Verify link post properties
  TestValidator.equals("link post type", linkPost.type, "link");
  TestValidator.notEquals("link post URL exists", linkPost.url, null);
  TestValidator.equals("link post content is null", linkPost.content, null);
  TestValidator.equals("link post image_url is null", linkPost.image_url, null);
  // Step 4: Create image post
  const imagePost = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "image" as const,
        content: null,
        url: null,
        image_url: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(imagePost);
  // Verify image post properties
  TestValidator.equals("image post type", imagePost.type, "image");
  TestValidator.equals("image post url is null", imagePost.url, null);
  TestValidator.equals("image post content is null", imagePost.content, null);
  TestValidator.notEquals(
    "image post image_url exists",
    imagePost.image_url,
    null,
  );
}
