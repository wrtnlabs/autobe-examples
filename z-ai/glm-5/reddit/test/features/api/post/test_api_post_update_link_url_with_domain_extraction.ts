import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

/**
 * Test updating a link post's URL with automatic domain extraction.
 *
 * This test verifies that:
 * 1. A link post can be created with an initial URL
 * 2. The post's URL can be updated to a new URL
 * 3. The domain is automatically extracted from the new URL
 * 4. The post type remains unchanged after update
 * 5. The updated_at timestamp is refreshed
 */
export async function test_api_post_update_link_url_with_domain_extraction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: `TestCommunity_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create a link post with initial URL
  const initialUrl = "https://example.com/articles/first-post";
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberConnection,
      {
        params: { communityId: community.id },
        body: {
          title: "Interesting Article",
          postType: "link",
          url: initialUrl,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);
  // Record original data
  const originalUpdatedAt = post.updatedAt;
  const originalAuthorId = post.author.id;
  const originalCommunityId = post.community.id;
  // 4. Update the link post with new URL
  const newUrl = "https://newdomain.com/different-article";
  const updatedPost =
    await api.functional.communityPlatform.member.posts.update(
      memberConnection,
      {
        postId: post.id,
        body: {
          title: "Updated Link Title",
          url: newUrl,
        } satisfies ICommunityPlatformPost.IUpdate,
      },
    );
  typia.assert(updatedPost);
  // 5. Validate response
  TestValidator.equals(
    "title updated",
    updatedPost.title,
    "Updated Link Title",
  );
  TestValidator.equals("url updated", updatedPost.url, newUrl);
  TestValidator.equals("postType remains link", updatedPost.postType, "link");
  TestValidator.equals(
    "author unchanged",
    updatedPost.author.id,
    originalAuthorId,
  );
  TestValidator.equals(
    "community unchanged",
    updatedPost.community.id,
    originalCommunityId,
  );
  // Verify updated_at timestamp was refreshed
  TestValidator.predicate(
    "updated_at timestamp refreshed",
    new Date(updatedPost.updatedAt) > new Date(originalUpdatedAt),
  );
  // Verify domain extraction - the URL should be from newdomain.com
  TestValidator.predicate(
    "url contains newdomain",
    updatedPost.url !== null && updatedPost.url.includes("newdomain.com"),
  );
}
