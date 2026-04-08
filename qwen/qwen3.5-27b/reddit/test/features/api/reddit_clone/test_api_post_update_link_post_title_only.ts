import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test that a member can perform a partial update on their own link post by updating only the title while keeping the link URL unchanged.
 *
 * Validates the partial update functionality for link posts, ensuring that when only the title field is provided in the update request, the link URL and other fields remain unchanged. The test verifies that the created_at timestamp is preserved while the updated_at timestamp is refreshed.
 *
 * Special attention is given to verifying that the link_url field retains its original value after the partial update, and that the post_type remains 'link' throughout the operation.
 *
 * 1. Register and authenticate as a member with email, password, and username.
 * 2. Create a link post with initial title and link URL in a subscribed community.
 * 3. Update the post with only a new title (omit link_url in request body).
 * 4. Validate that the new title is reflected in the response.
 * 5. Validate that the original link_url is unchanged.
 * 6. Validate that created_at timestamp is preserved.
 * 7. Validate that updated_at timestamp is newer than created_at.
 * 8. Validate that post_type remains 'link'.
 */
export async function test_api_post_update_link_post_title_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a link post with initial title and link URL
  const initialTitle = RandomGenerator.paragraph({ sentences: 3 });
  const linkUrl = typia.random<string & tags.Format<"url">>();
  const post = await api.functional.redditClone.member.posts.create(
    memberConnection,
    {
      body: {
        title: initialTitle,
        post_type: "link",
        link_url: linkUrl,
        community_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  const originalCreatedAt = post.created_at;
  const originalLinkUrl = post.link_url;
  // 3. Update the post with only a new title
  const newTitle = RandomGenerator.paragraph({ sentences: 4 });
  const updatedPost = await api.functional.redditClone.member.posts.update(
    memberConnection,
    {
      postId: post.id,
      body: {
        title: newTitle,
      } satisfies IRedditClonePost.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // 4. Validate that the new title is reflected in the response
  TestValidator.equals(
    "title updated to new value",
    updatedPost.title,
    newTitle,
  );
  // 5. Validate that the title is different from initial title
  TestValidator.notEquals(
    "title changed from initial",
    updatedPost.title,
    initialTitle,
  );
  // 6. Validate that the original link_url is unchanged
  TestValidator.equals(
    "link_url remains unchanged",
    updatedPost.link_url,
    originalLinkUrl,
  );
  // 7. Validate that created_at timestamp is preserved
  TestValidator.equals(
    "created_at preserved",
    updatedPost.created_at,
    originalCreatedAt,
  );
  // 8. Validate that updated_at timestamp is newer than created_at
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updatedPost.updated_at).getTime() >
      new Date(originalCreatedAt).getTime(),
  );
  // 9. Validate that post_type remains 'link'
  TestValidator.equals("post_type remains link", updatedPost.post_type, "link");
  // 10. Validate that author information matches the authenticated member
  TestValidator.equals(
    "author display_name matches member",
    updatedPost.author.display_name,
    member.display_name,
  );
  // 11. Validate that community information is included
  TestValidator.predicate(
    "community has valid name",
    updatedPost.community.name.length > 0,
  );
}
