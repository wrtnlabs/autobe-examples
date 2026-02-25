import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

export async function test_api_member_posts_list_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test retrieving a member's post history with successful pagination
  // and post type differentiation.
  //
  // Prerequisites:
  // 1. Create a member account via join endpoint
  // 2. Create a community (member becomes owner and auto-subscribed)
  // 3. Create multiple posts of different types (TEXT, LINK, IMAGE)
  // 4. Call the endpoint to retrieve member's posts
  // 5. Verify pagination metadata and post details
  // Step 1: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Create a community (member becomes owner and is auto-subscribed)
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Create multiple posts of different types
  // TEXT post
  const textPost =
    await generate_random_community_member_communities_posts_create(
      memberConnection,
      {
        params: { communityName: community.name },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          post_type: "TEXT",
          text_content: RandomGenerator.content({ paragraphs: 3 }),
        },
      },
    );
  typia.assert(textPost);
  // LINK post
  const linkPost =
    await generate_random_community_member_communities_posts_create(
      memberConnection,
      {
        params: { communityName: community.name },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          post_type: "LINK",
          link_url: "https://www.example.com/article/test-article",
        },
      },
    );
  typia.assert(linkPost);
  // IMAGE post
  const imagePost =
    await generate_random_community_member_communities_posts_create(
      memberConnection,
      {
        params: { communityName: community.name },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          post_type: "IMAGE",
          image_url: "https://example.com/images/test-image.jpg",
        },
      },
    );
  typia.assert(imagePost);
  // Step 4: Call the endpoint to retrieve member's posts
  const result = await api.functional.community.members.posts.index(
    connection,
    {
      memberId: member.id,
      body: {
        limit: 10,
        page: 1,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(result);
  // Step 5: Verify pagination metadata
  TestValidator.predicate(
    "pagination current page",
    result.pagination.current === 1,
  );
  TestValidator.predicate("pagination limit", result.pagination.limit === 10);
  TestValidator.predicate("pagination records", result.pagination.records >= 3);
  TestValidator.predicate("pagination pages", result.pagination.pages >= 1);
  // Step 6: Verify posts are present in the result
  TestValidator.predicate("data array has posts", result.data.length >= 3);
  // Step 7: Verify each post has required fields
  const postIds = result.data.map((p) => p.id);
  TestValidator.predicate(
    "text post is in results",
    postIds.includes(textPost.id),
  );
  TestValidator.predicate(
    "link post is in results",
    postIds.includes(linkPost.id),
  );
  TestValidator.predicate(
    "image post is in results",
    postIds.includes(imagePost.id),
  );
  // Step 8: Verify post type differentiation in results
  const textPostResult = result.data.find((p) => p.id === textPost.id);
  const linkPostResult = result.data.find((p) => p.id === linkPost.id);
  const imagePostResult = result.data.find((p) => p.id === imagePost.id);
  // TEXT post: verify text_preview exists
  if (textPostResult !== undefined) {
    TestValidator.predicate(
      "text post has text_preview",
      textPostResult.text_preview !== null,
    );
    TestValidator.equals("text post type", textPostResult.post_type, "TEXT");
    TestValidator.predicate(
      "text post link_domain is null",
      textPostResult.link_domain === null,
    );
    TestValidator.predicate(
      "text post image_thumbnail_url is null",
      textPostResult.image_thumbnail_url === null,
    );
  }
  // LINK post: verify link_domain is extracted
  if (linkPostResult !== undefined) {
    TestValidator.equals("link post type", linkPostResult.post_type, "LINK");
    TestValidator.predicate(
      "link post has link_domain",
      linkPostResult.link_domain !== null,
    );
    TestValidator.predicate(
      "link post text_preview is null",
      linkPostResult.text_preview === null,
    );
    TestValidator.predicate(
      "link post image_thumbnail_url is null",
      linkPostResult.image_thumbnail_url === null,
    );
  }
  // IMAGE post: verify image_thumbnail_url exists
  if (imagePostResult !== undefined) {
    TestValidator.equals("image post type", imagePostResult.post_type, "IMAGE");
    TestValidator.predicate(
      "image post has image_thumbnail_url",
      imagePostResult.image_thumbnail_url !== null,
    );
    TestValidator.predicate(
      "image post text_preview is null",
      imagePostResult.text_preview === null,
    );
    TestValidator.predicate(
      "image post link_domain is null",
      imagePostResult.link_domain === null,
    );
  }
  // Step 9: Verify author info in posts
  for (const post of result.data) {
    TestValidator.equals("author id matches member", post.author.id, member.id);
    TestValidator.equals(
      "author username matches",
      post.author.username,
      member.username,
    );
  }
  // Step 10: Verify community info in posts
  const communityPosts = result.data.filter(
    (p) => p.community.id === community.id,
  );
  TestValidator.predicate(
    "posts belong to created community",
    communityPosts.length >= 3,
  );
}
