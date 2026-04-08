import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostSnapshot";
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
import { generate_random_reddit_clone_posts_snapshots_create } from "../../../generate/generate_random_reddit_clone_posts_snapshots_create";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_snapshot } from "../../../prepare/prepare_random_reddit_clone_post_snapshot";

/**
 * Test successful creation of a post snapshot that captures the complete state of an existing post at a point in time.
 *
 * Validates the complete post snapshot creation workflow including member authentication, post creation, and snapshot generation. Ensures that snapshots accurately capture the post state at the moment of creation, including title, content type, and content fields. Verifies that multiple snapshots can be created for the same post and that each snapshot contains the complete denormalized post data.
 *
 * Special attention is given to verifying that the snapshot contains all required fields including the unique snapshot ID, post type discriminator, content fields (text_content for text posts), timestamp, and parent post reference with summary information.
 *
 * 1. Register and authenticate as a member user with email, password, and username.
 * 2. Create a text post with title and content in a community.
 * 3. Create a snapshot of the post using the post ID.
 * 4. Validate the snapshot response contains all required fields.
 * 5. Verify snapshot data matches the original post data.
 * 6. Create a second snapshot to verify multiple snapshots can exist.
 * 7. Validate both snapshots have unique IDs.
 */
export async function test_api_post_snapshot_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a text post
  const post: IRedditClonePost =
    await generate_random_reddit_clone_member_posts_create(memberConnection, {
      body: {
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        text_content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      },
    });
  typia.assert(post);
  // 3. Create first snapshot
  const snapshot1: IRedditClonePostSnapshot =
    await generate_random_reddit_clone_posts_snapshots_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {},
      },
    );
  typia.assert(snapshot1);
  // 4. Validate snapshot1 contains all required fields
  TestValidator.equals(
    "snapshot1 title matches post title",
    snapshot1.title,
    post.title,
  );
  TestValidator.equals(
    "snapshot1 post_type matches post type",
    snapshot1.post_type,
    post.post_type,
  );
  TestValidator.equals(
    "snapshot1 text_content matches post text_content",
    snapshot1.text_content,
    post.text_content,
  );
  TestValidator.predicate(
    "snapshot1 has valid snapshot_created_at timestamp",
    snapshot1.snapshot_created_at !== undefined,
  );
  TestValidator.predicate(
    "snapshot1 has valid post reference",
    snapshot1.post !== undefined,
  );
  TestValidator.equals(
    "snapshot1 post reference ID matches original post ID",
    snapshot1.post.id,
    post.id,
  );
  // 5. Create second snapshot
  const snapshot2: IRedditClonePostSnapshot =
    await generate_random_reddit_clone_posts_snapshots_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {},
      },
    );
  typia.assert(snapshot2);
  // 6. Verify both snapshots have unique IDs
  TestValidator.notEquals(
    "snapshot IDs are unique",
    snapshot1.id,
    snapshot2.id,
  );
  // 7. Verify second snapshot also matches post data
  TestValidator.equals(
    "snapshot2 title matches post title",
    snapshot2.title,
    post.title,
  );
  TestValidator.equals(
    "snapshot2 text_content matches post text_content",
    snapshot2.text_content,
    post.text_content,
  );
}
