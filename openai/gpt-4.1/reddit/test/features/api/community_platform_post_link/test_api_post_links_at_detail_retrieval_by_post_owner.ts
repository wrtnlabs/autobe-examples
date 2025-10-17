import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";

/**
 * Validate retrieval of detailed preview metadata for a link attached to a
 * post. Covers member signup, community creation, post creation, linking,
 * retrieval, and errors/permissions.
 *
 * Steps:
 *
 * 1. Register a new member and authenticate
 * 2. Create a new community
 * 3. Create a new post in the community
 * 4. Attach a link to the post
 * 5. Retrieve the link by its ID (positive flow)
 *
 *    - Validate all fields (id, url, community_platform_post_id, preview fields)
 * 6. Error: Attempt retrieval with wrong postId, wrong linkId, or mismatched IDs -
 *    expect error
 * 7. Optionally: Test permissions by simulating unauthenticated or forbidden
 *    access (if exposed)
 */
export async function test_api_post_links_at_detail_retrieval_by_post_owner(
  connection: api.IConnection,
) {
  // 1. Register a new member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const authorized: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(authorized);

  // 2. Create a new community
  const communityBody = {
    name: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    slug: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "created community name matches input",
    community.name,
    communityBody.name,
  );
  TestValidator.equals(
    "created community slug matches input",
    community.slug,
    communityBody.slug,
  );

  // 3. Create a new post in the community
  const postBody = {
    community_platform_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content_body: RandomGenerator.content({ paragraphs: 2 }),
    content_type: "link",
    status: "published",
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);
  TestValidator.equals(
    "created post community id matches",
    post.community_platform_community_id,
    community.id,
  );
  TestValidator.equals("content_type is 'link'", post.content_type, "link");

  // 4. Attach a link to the post
  const linkCreateBody = {
    url: "https://www.example.com/page/" + RandomGenerator.alphaNumeric(10),
    preview_title: RandomGenerator.paragraph({ sentences: 2 }),
    preview_description: RandomGenerator.content({ paragraphs: 1 }),
    preview_image_uri:
      "https://img.example.com/preview/" +
      RandomGenerator.alphaNumeric(8) +
      ".jpg",
  } satisfies ICommunityPlatformPostLink.ICreate;
  const link: ICommunityPlatformPostLink =
    await api.functional.communityPlatform.member.posts.links.create(
      connection,
      {
        postId: post.id,
        body: linkCreateBody,
      },
    );
  typia.assert(link);
  TestValidator.equals(
    "link parent post id matches",
    link.community_platform_post_id,
    post.id,
  );
  TestValidator.equals("link url matches", link.url, linkCreateBody.url);

  // 5. Retrieve the link by its ID
  const detail: ICommunityPlatformPostLink =
    await api.functional.communityPlatform.posts.links.at(connection, {
      postId: post.id,
      linkId: link.id,
    });
  typia.assert(detail);
  TestValidator.equals("link detail id matches", detail.id, link.id);
  TestValidator.equals("link detail url matches", detail.url, link.url);
  TestValidator.equals(
    "link detail parent postId matches",
    detail.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "preview_title matches",
    detail.preview_title,
    link.preview_title,
  );
  TestValidator.equals(
    "preview_description matches",
    detail.preview_description,
    link.preview_description,
  );
  TestValidator.equals(
    "preview_image_uri matches",
    detail.preview_image_uri,
    link.preview_image_uri,
  );

  // 6. Error: Retrieval with wrong postId (should fail)
  const wrongPostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieval with invalid postId should fail",
    async () => {
      await api.functional.communityPlatform.posts.links.at(connection, {
        postId: wrongPostId,
        linkId: link.id,
      });
    },
  );

  // 7. Error: Retrieval with wrong linkId (should fail)
  const wrongLinkId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieval with invalid linkId should fail",
    async () => {
      await api.functional.communityPlatform.posts.links.at(connection, {
        postId: post.id,
        linkId: wrongLinkId,
      });
    },
  );

  // 8. Error: Retrieval with mismatched postId/linkId (should fail)
  // Create another post and attach another link
  const postBody2 = {
    community_platform_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content_body: RandomGenerator.content({ paragraphs: 1 }),
    content_type: "link",
    status: "published",
  } satisfies ICommunityPlatformPost.ICreate;
  const post2: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: postBody2,
    });
  typia.assert(post2);

  const linkCreateBody2 = {
    url: "https://www.other.com/resource/" + RandomGenerator.alphaNumeric(10),
    preview_title: RandomGenerator.paragraph({ sentences: 2 }),
    preview_description: RandomGenerator.content({ paragraphs: 1 }),
    preview_image_uri:
      "https://img.example.com/preview/" +
      RandomGenerator.alphaNumeric(8) +
      ".jpg",
  } satisfies ICommunityPlatformPostLink.ICreate;
  const link2: ICommunityPlatformPostLink =
    await api.functional.communityPlatform.member.posts.links.create(
      connection,
      {
        postId: post2.id,
        body: linkCreateBody2,
      },
    );
  typia.assert(link2);

  await TestValidator.error(
    "retrieval with mismatched postId/linkId should fail",
    async () => {
      await api.functional.communityPlatform.posts.links.at(connection, {
        postId: post.id, // from first post
        linkId: link2.id, // from second post
      });
    },
  );
}
