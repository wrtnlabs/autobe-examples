import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test post creation workflow respecting community posting permission settings.
 *
 * This test validates that moderators can create posts in communities
 * regardless of posting permission restrictions. The workflow:
 *
 * 1. Create a member account for community ownership
 * 2. Create a community with specific posting permissions
 * 3. Create a moderator account
 * 4. Moderator creates a post in the community
 * 5. Verify post creation succeeds despite permission settings
 *
 * This confirms that moderators have elevated privileges and can bypass
 * standard posting restrictions that would apply to regular members.
 */
export async function test_api_post_creation_with_community_posting_permissions(
  connection: api.IConnection,
) {
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  const postingPermissions = [
    "anyone_subscribed",
    "approved_only",
    "moderators_only",
  ] as const;
  const selectedPermission = RandomGenerator.pick(postingPermissions);

  const communityCode = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<25> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: communityCode,
        name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
        description: typia.random<
          string & tags.MinLength<10> & tags.MaxLength<500>
        >(),
        posting_permission: selectedPermission,
        privacy_type: "public",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  TestValidator.equals(
    "community posting permission",
    community.posting_permission,
    selectedPermission,
  );

  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  const postTypes = ["text", "link", "image"] as const;
  const selectedPostType = RandomGenerator.pick(postTypes);

  const postTitle = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<300>
  >();

  let postBody: IRedditLikePost.ICreate;

  if (selectedPostType === "text") {
    postBody = {
      community_id: community.id,
      type: "text",
      title: postTitle,
      body: typia.random<string & tags.MaxLength<40000>>(),
    } satisfies IRedditLikePost.ICreate;
  } else if (selectedPostType === "link") {
    postBody = {
      community_id: community.id,
      type: "link",
      title: postTitle,
      url: typia.random<string & tags.MaxLength<2000>>(),
    } satisfies IRedditLikePost.ICreate;
  } else {
    postBody = {
      community_id: community.id,
      type: "image",
      title: postTitle,
      image_url: typia.random<string>(),
      caption: typia.random<string & tags.MaxLength<10000>>(),
    } satisfies IRedditLikePost.ICreate;
  }

  const post = await api.functional.redditLike.moderator.posts.create(
    connection,
    {
      body: postBody,
    },
  );
  typia.assert(post);

  TestValidator.equals("post type matches", post.type, selectedPostType);
  TestValidator.equals("post title matches", post.title, postTitle);
  TestValidator.predicate("post has valid ID", post.id.length > 0);
  TestValidator.predicate(
    "post has creation timestamp",
    post.created_at.length > 0,
  );
}
