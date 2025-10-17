import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

export async function test_api_post_removal_by_moderator_for_rule_violation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: moderatorEmail,
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create community with moderator as owner
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
        description: typia.random<
          string & tags.MinLength<10> & tags.MaxLength<500>
        >(),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create and authenticate member account (post author)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: memberEmail,
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Member creates a post in the community
  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: typia.random<string & tags.MinLength<3> & tags.MaxLength<300>>(),
      body: typia.random<string & tags.MaxLength<40000>>(),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 5: Create comments on the post to verify they remain accessible after removal
  const comment1 = await api.functional.redditLike.member.comments.create(
    connection,
    {
      body: {
        reddit_like_post_id: post.id,
        content_text: typia.random<
          string & tags.MinLength<1> & tags.MaxLength<10000>
        >(),
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment1);

  const comment2 = await api.functional.redditLike.member.comments.create(
    connection,
    {
      body: {
        reddit_like_post_id: post.id,
        reddit_like_parent_comment_id: comment1.id,
        content_text: typia.random<
          string & tags.MinLength<1> & tags.MaxLength<10000>
        >(),
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment2);

  // Step 6: Submit a content report on the post
  const contentReport = await api.functional.redditLike.content_reports.create(
    connection,
    {
      body: {
        reported_post_id: post.id,
        community_id: community.id,
        content_type: "post",
        violation_categories: "spam,harassment",
        additional_context: typia.random<string & tags.MaxLength<500>>(),
      } satisfies IRedditLikeContentReport.ICreate,
    },
  );
  typia.assert(contentReport);

  // Step 7: Moderator removes the post for community-level rule violation
  // Note: Moderator is already authenticated from Step 1, no need to re-authenticate
  await api.functional.redditLike.moderator.posts.remove(connection, {
    postId: post.id,
    body: {
      removal_type: "community",
      reason_category: "spam",
      reason_text:
        "This post violates community rules regarding spam content. Multiple users have reported this post for promotional content without disclosure.",
      internal_notes:
        "Post contained undisclosed affiliate links. User has been warned previously.",
      report_id: contentReport.id,
    } satisfies IRedditLikePost.IRemove,
  });

  // Step 8: Switch back to member to create another post for platform-level removal test
  await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });

  const post2 = await api.functional.redditLike.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        type: "link",
        title: typia.random<string & tags.MinLength<3> & tags.MaxLength<300>>(),
        url: typia.random<string & tags.MaxLength<2000>>(),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post2);

  // Step 9: Switch back to moderator and test platform-level removal
  await api.functional.auth.moderator.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeModerator.ICreate,
  });

  await api.functional.redditLike.moderator.posts.remove(connection, {
    postId: post2.id,
    body: {
      removal_type: "platform",
      reason_category: "violence",
      reason_text:
        "This content violates platform-wide content policy regarding violent content.",
      internal_notes: "Escalated to platform admins for account review.",
    } satisfies IRedditLikePost.IRemove,
  });
}
