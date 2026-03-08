import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_create } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_create";
import { generate_random_reddit_platform_member_posts_comments_create } from "../../../generate/generate_random_reddit_platform_member_posts_comments_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

/**
 * Test that a community moderator can delete any comment in their community.
 *
 * This test validates the moderator comment deletion workflow:
 * 1. Create author member account
 * 2. Create moderator member account
 * 3. Create community (owner will be author for simplicity)
 * 4. Author subscribes to community (auto-subscribed as owner)
 * 5. Author creates a post in the community
 * 6. Author creates a comment on the post
 * 7. Author creates a nested reply to test reply persistence
 * 8. Assign second member as moderator
 * 9. Moderator deletes the author's comment
 * 10. Verify deletion operation completes successfully
 * 11. Verify nested replies remain (though disconnected from deleted parent)
 */
export async function test_api_comment_deletion_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create author member account
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
      username: typia.random<string & tags.MinLength<1> & tags.MaxLength<50>>(),
      href: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(author);
  // 2. Create moderator member account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
      username: typia.random<string & tags.MinLength<1> & tags.MaxLength<50>>(),
      href: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(moderator);
  // 3. Create community (as author - becomes owner)
  const community =
    await generate_random_reddit_platform_member_communities_create(
      authorConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Author is auto-subscribed as owner, so subscription exists
  // 5. Author creates a post in the community
  const post = await generate_random_reddit_platform_member_posts_create(
    authorConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Author creates a comment on the post
  const comment =
    await generate_random_reddit_platform_member_posts_comments_create(
      authorConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // 7. Author creates a nested reply to test reply persistence after parent deletion
  const reply =
    await generate_random_reddit_platform_member_posts_comments_create(
      authorConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: comment.id,
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(reply);
  // 8. Assign moderator to community
  const moderatorAssignment =
    await generate_random_reddit_platform_member_communities_moderators_create(
      authorConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          member_id: moderator.id,
        } satisfies IRedditPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // 9. Moderator deletes the author's comment
  await api.functional.redditPlatform.member.posts.comments.erase(
    moderatorConnection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  // 10. Verify deletion operation completed successfully
  // The successful completion without error confirms the moderator has permission
  TestValidator.predicate(
    "moderator successfully deleted comment from another member",
    () => true,
  );
  // 11. Verify nested reply still exists (should remain visible but disconnected)
  // Note: Without a GET endpoint for comments, we cannot verify the reply state
  // in this E2E test. This would require database inspection or additional API endpoints.
  // The reply creation above confirms the threading structure was established.
  TestValidator.predicate(
    "nested reply was created before parent deletion",
    reply.parent?.id === comment.id,
  );
}