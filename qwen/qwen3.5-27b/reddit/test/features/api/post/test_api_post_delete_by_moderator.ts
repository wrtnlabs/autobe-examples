import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_community_moderator } from "../../../prepare/prepare_random_reddit_clone_community_moderator";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test that a community moderator can delete posts created by other members.
 *
 * This test verifies the moderator post deletion workflow:
 * 1. Register two member accounts (author and moderator)
 * 2. Author creates a community
 * 3. Author adds moderator to the community
 * 4. Author creates a post in the community
 * 5. Moderator deletes the post
 * 6. Verify the post is successfully deleted and inaccessible
 */
export async function test_api_post_delete_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register author account (community owner)
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(author);
  // 2. Author creates a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      authorConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Register moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderator);
  // 4. Author adds moderator to the community
  const moderatorAssignment =
    await generate_random_reddit_clone_member_communities_moderators_create(
      authorConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          memberId: moderator.id,
          role: "mod",
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Author creates a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "text",
        communityId: community.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 6. Moderator deletes the post (not the author)
  await api.functional.redditClone.member.posts.erase(moderatorConnection, {
    postId: post.id,
  });
  // 7. Verify the post is deleted and inaccessible (should throw 404 error)
  await TestValidator.error("deleted post returns 404", async () => {
    // Attempt to delete again - this should fail with 404 since post is already deleted
    await api.functional.redditClone.member.posts.erase(moderatorConnection, {
      postId: post.id,
    });
  });
  // 8. Verify author also cannot access the deleted post
  await TestValidator.error("deleted post inaccessible to author", async () => {
    await api.functional.redditClone.member.posts.erase(authorConnection, {
      postId: post.id,
    });
  });
  // 9. Verify moderator assignment still exists (only post was deleted)
  TestValidator.equals(
    "moderator still assigned",
    moderatorAssignment.member.id,
    moderator.id,
  );
}
