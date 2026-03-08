import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

/**
 * Test post update by author success.
 *
 * Scenario: A post author successfully updates their own text post.
 * 1. Member authentication via join
 * 2. Create a community (member becomes owner and auto-subscribed)
 * 3. Create a text post in that community
 * 4. Update the post with new title and text_content
 * 5. Verify all updated fields and immutability constraints
 */
export async function test_api_post_update_by_author_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // Step 2: Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Create a text post
  const originalPost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          contentType: "text",
          textContent: RandomGenerator.content({ paragraphs: 2 }),
          linkUrl: null,
          imageUrl: null,
        },
      },
    );
  typia.assert(originalPost);
  // Step 4: Update the post
  const updatedTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedTextContent = RandomGenerator.content({ paragraphs: 3 });
  const updatedPost =
    await api.functional.communityPlatform.member.posts.update(
      memberConnection,
      {
        postId: originalPost.id,
        body: {
          title: updatedTitle,
          text_content: updatedTextContent,
        } satisfies ICommunityPlatformPost.IUpdate,
      },
    );
  typia.assert(updatedPost);
  // Step 5: Validate the update
  TestValidator.equals("post ID unchanged", updatedPost.id, originalPost.id);
  TestValidator.equals("title updated", updatedPost.title, updatedTitle);
  TestValidator.equals(
    "text_content updated",
    updatedPost.text_content,
    updatedTextContent,
  );
  TestValidator.equals(
    "content_type unchanged",
    updatedPost.content_type,
    "text",
  );
  TestValidator.equals(
    "community ID unchanged",
    updatedPost.community.id,
    community.id,
  );
  TestValidator.equals(
    "author ID unchanged",
    updatedPost.author.id,
    authorized.id,
  );
  TestValidator.predicate(
    "updated_at greater than created_at",
    new Date(updatedPost.updated_at).getTime() >
      new Date(updatedPost.created_at).getTime(),
  );
  TestValidator.predicate(
    "score unchanged",
    updatedPost.score === originalPost.score,
  );
  TestValidator.predicate(
    "comment_count unchanged",
    updatedPost.comment_count === originalPost.comment_count,
  );
}
