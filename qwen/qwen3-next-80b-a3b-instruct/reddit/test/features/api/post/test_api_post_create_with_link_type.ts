import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_post_create_with_link_type(
  connection: api.IConnection,
) {
  // Step 1: Authenticate member to create a post
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberUsername: string = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const memberPassword: string = typia.random<
    string &
      tags.MinLength<8> &
      tags.MaxLength<128> &
      tags.Pattern<"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$">
  >();

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: memberPassword,
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);

  // Step 2: Create a community to associate the post with
  const communityName: string = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9-]+$">
  >();
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create a link post with a valid URL
  const validUrl: string = typia.random<string & tags.Format<"uri">>();
  const postTitle: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });

  const createdPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: postTitle,
        post_type: "link",
        url: validUrl,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(createdPost);

  // Step 4: Validate the created link post
  TestValidator.equals(
    "post type should be 'link'",
    createdPost.post_type,
    "link",
  );
  TestValidator.equals("title should match", createdPost.title, postTitle);
  TestValidator.predicate(
    "url should be valid and match",
    () => createdPost.link_url === validUrl,
  );
  TestValidator.equals("content should be null", createdPost.content, null);
  TestValidator.equals(
    "author_id should match member id",
    createdPost.author_id,
    member.id,
  );
  TestValidator.equals(
    "community id should match created community",
    createdPost.community_platform_community_id,
    community.id,
  );

  // Step 5: Test that invalid URL is rejected
  await TestValidator.error("invalid URL should fail", async () => {
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: "Invalid URL test",
        post_type: "link",
        url: "not-a-url",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  });

  // Step 6: Test that post is published when community has no review mode
  TestValidator.equals(
    "post status should be published when no review mode",
    createdPost.status,
    "published",
  );

  // Step 7: Create another community with post review mode enabled
  const reviewCommunityName: string = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9-]+$">
  >();
  const reviewCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: reviewCommunityName,
          description: "Community with review mode",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(reviewCommunity);

  // Step 8: Attempt to create a post in the review community - status should be unreviewed
  const reviewPostTitle: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const reviewPostUrl: string = typia.random<string & tags.Format<"uri">>();

  const reviewPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: reviewPostTitle,
        post_type: "link",
        url: reviewPostUrl,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(reviewPost);

  // Step 9: Validate post in review community has unreviewed status
  TestValidator.equals(
    "post status should be unreviewed in review community",
    reviewPost.status,
    "unreviewed",
  );
}
