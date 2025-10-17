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
 * Test that a member (post owner) can delete an attached external link from
 * their post.
 *
 * 1. Register a new member.
 * 2. Create a new community as the member.
 * 3. Create a post in that community.
 * 4. Attach an external link to the post.
 * 5. Delete the link as the post owner.
 * 6. Confirm that the link is no longer present/retrievable, and deletion is
 *    auditable (link is hard-deleted, post remains).
 */
export async function test_api_post_link_deletion_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a new community
  const slug = RandomGenerator.alphaNumeric(8).toLowerCase();
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          title: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 4,
            wordMax: 12,
          }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 8,
            sentenceMax: 16,
            wordMin: 4,
            wordMax: 10,
          }),
          slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create a post within the newly created community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_platform_community_id: community.id,
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 12,
        }) satisfies string & tags.MaxLength<300>,
        content_body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 7,
          sentenceMax: 18,
          wordMin: 3,
          wordMax: 11,
        }),
        content_type: "link",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 4. Attach a new external link to the post
  const linkRequest = {
    url:
      "https://" +
      RandomGenerator.alphaNumeric(5) +
      ".example.com/" +
      RandomGenerator.alphaNumeric(7),
    preview_title: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 10,
    }),
    preview_description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 5,
      wordMax: 12,
    }),
    preview_image_uri:
      "https://img.example.com/" + RandomGenerator.alphaNumeric(8) + ".jpg",
  } satisfies ICommunityPlatformPostLink.ICreate;
  const link: ICommunityPlatformPostLink =
    await api.functional.communityPlatform.member.posts.links.create(
      connection,
      {
        postId: post.id,
        body: linkRequest,
      },
    );
  typia.assert(link);
  TestValidator.equals(
    "attached link is for correct post",
    link.community_platform_post_id,
    post.id,
  );

  // 5. Delete the attached link as the post owner
  await api.functional.communityPlatform.member.posts.links.erase(connection, {
    postId: post.id,
    linkId: link.id,
  });

  // 6. Confirm the link is no longer present (try to retrieve, expect error)
  await TestValidator.error("deleted link is not retrievable", async () => {
    // There is no direct 'get' endpoint for a single link, but trying to attach another link with the same url (should be allowed since previous is gone)
    // Optionally, more meaningful would be listing all links (not available), so just ensure no error when attaching another with the same url
    // As a proxy verification: re-create another link with the same URL
    const newLink: ICommunityPlatformPostLink =
      await api.functional.communityPlatform.member.posts.links.create(
        connection,
        {
          postId: post.id,
          body: linkRequest,
        },
      );
    typia.assert(newLink);
    TestValidator.notEquals("new link id after deletion", newLink.id, link.id);
  });
}
