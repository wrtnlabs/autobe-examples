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
 * Validate that a registered member can create a community and make a link-type
 * post, then attach a valid external URL to that post.
 *
 * Steps:
 *
 * 1. Register a unique user and authenticate (member).
 * 2. Create a new community as the member.
 * 3. Create a new post in that community of type 'link'.
 * 4. Attach a link (well-formed URL) to the post; validate response structure and
 *    preview fields.
 * 5. Attempt to attach an invalid or blacklisted URL; assert error is thrown
 *    (policy violation).
 */
export async function test_api_post_link_creation_by_member(
  connection: api.IConnection,
) {
  // 1. Register member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Create community as this member
  const communityBody = {
    name: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    slug: RandomGenerator.alphaNumeric(16),
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community created with provided name",
    community.name,
    communityBody.name,
  );

  // 3. Create link-type post
  const postBody = {
    community_platform_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    content_type: "link",
    status: "published",
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: postBody,
    },
  );
  typia.assert(post);
  TestValidator.equals(
    "post community id matches",
    post.community_platform_community_id,
    community.id,
  );
  TestValidator.equals("post type is 'link'", post.content_type, "link");

  // 4. Attach a valid link to post
  const validLinkBody = {
    url: "https://www.example.com/valid-content",
    // preview fields omitted, expect backend to fetch if needed
  } satisfies ICommunityPlatformPostLink.ICreate;
  const link = await api.functional.communityPlatform.member.posts.links.create(
    connection,
    {
      postId: post.id,
      body: validLinkBody,
    },
  );
  typia.assert(link);
  TestValidator.equals(
    "linked post id matches",
    link.community_platform_post_id,
    post.id,
  );
  TestValidator.equals("link url matches input", link.url, validLinkBody.url);
  TestValidator.predicate(
    "preview title/description present or null",
    typeof link.preview_title === "string" ||
      typeof link.preview_title === "undefined",
  );

  // 5. Edge case: Attach an invalid/blacklisted URL
  await TestValidator.error(
    "attaching invalid/blacklisted url is rejected",
    async () => {
      await api.functional.communityPlatform.member.posts.links.create(
        connection,
        {
          postId: post.id,
          body: {
            url: "http://malicious-site.com/bad",
            // no preview fields
          } satisfies ICommunityPlatformPostLink.ICreate,
        },
      );
    },
  );
}
