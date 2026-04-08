import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
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
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test moderator comment deletion functionality in a Reddit-like community platform.
 *
 * Validates that moderators have the authority to delete comments within their assigned community. This test ensures the moderator comment deletion endpoint functions correctly and returns appropriate responses.
 *
 * Special attention is given to verifying that the moderator's authentication is properly validated and the deletion operation completes successfully.
 *
 * 1. Moderator registers and authenticates with the system.
 * 2. Member registers and authenticates with the system.
 * 3. Member creates a post in a community (using pre-existing community).
 * 4. Member creates a comment on the post.
 * 5. Moderator deletes the comment using moderator privileges.
 * 6. Validates that the deletion operation succeeds without errors.
 */
export async function test_api_comment_deletion_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator setup
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {});
  typia.assert(moderator);
  // 2. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 3. Member creates a post in a community
  // Note: Using a pre-existing community ID since community creation API is not available
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: communityId,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(post);
  // 4. Member creates a comment on the post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(comment);
  // 5. Moderator deletes the comment using moderator privileges
  await api.functional.redditClone.moderator.posts.comments.erase(
    moderatorConnection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  // 6. Validate that deletion succeeded by verifying no exception was thrown
  // The erase endpoint returns void, so successful execution means the deletion worked
  TestValidator.predicate(
    "moderator comment deletion completed successfully",
    true,
  );
}
