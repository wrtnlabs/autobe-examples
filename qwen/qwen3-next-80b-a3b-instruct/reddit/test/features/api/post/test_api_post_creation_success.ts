import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_post_creation_success(
  connection: api.IConnection,
) {
  // Authenticate member user
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);

  // Create a public community
  const communityName: string = RandomGenerator.name(1).toLowerCase();
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Create a post in the community
  const postTitle: string = RandomGenerator.paragraph({ sentences: 1 });
  const postContent: string = RandomGenerator.content({ paragraphs: 1 });
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: postTitle,
        content: postContent,
        post_type: "text",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Validate post creation
  TestValidator.equals("post title matches", post.title, postTitle);
  TestValidator.equals("post content matches", post.content, postContent);
  TestValidator.equals("post type is text", post.post_type, "text");
  TestValidator.equals("post status is published", post.status, "published");
  TestValidator.equals("post vote count is zero", post.vote_count, 0);
  TestValidator.equals("post comment count is zero", post.comment_count, 0);
  TestValidator.equals("author id matches member", post.author_id, member.id);
  TestValidator.equals(
    "community id matches",
    post.community_platform_community_id,
    community.id,
  );
}
