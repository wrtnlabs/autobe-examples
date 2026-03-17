import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostSnapshot";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_posts_snapshots_create } from "../../../generate/generate_random_reddit_clone_member_posts_snapshots_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_snapshot } from "../../../prepare/prepare_random_reddit_clone_post_snapshot";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";

/**
 * Test that a member can successfully retrieve a snapshot of their own post.
 *
 * Workflow:
 * 1. Authenticate as a member using authorize_member_join utility
 * 2. Create a community using generate_random_reddit_clone_communities_create utility
 * 3. Create a TEXT type post using generate_random_reddit_clone_member_posts_create utility
 * 4. Create a snapshot of the post using generate_random_reddit_clone_member_posts_snapshots_create utility
 * 5. Retrieve the snapshot using the post ID and snapshot ID
 *
 * Validation:
 * - Response contains all required fields: id, title, postType, textContent, linkUrl, imageFileId, createdAt
 * - postType is TEXT
 * - textContent contains the original post text
 * - linkUrl and imageFileId are null for TEXT posts
 * - Relation objects (post, member, community) contain correct summary information
 * - Snapshot preserves the exact post state at the time of capture
 */
export async function test_api_post_snapshot_retrieval_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a community
  const community = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: null,
      },
    },
  );
  typia.assert(community);
  // 3. Create a TEXT type post
  const originalText = RandomGenerator.content({ paragraphs: 2 });
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "TEXT",
        community_id: community.id,
        text: {
          body: originalText,
        } satisfies IRedditClonePostText.ICreate,
        link: null,
        image: null,
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create a snapshot of the post
  const snapshot =
    await generate_random_reddit_clone_member_posts_snapshots_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {} satisfies IRedditClonePostSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  // 5. Retrieve the snapshot
  const retrievedSnapshot =
    await api.functional.redditClone.member.posts.snapshots.at(
      memberConnection,
      {
        postId: post.id,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // Validate snapshot structure and content
  TestValidator.equals(
    "snapshot id matches",
    retrievedSnapshot.id,
    snapshot.id,
  );
  TestValidator.equals(
    "snapshot title matches post title",
    retrievedSnapshot.title,
    post.title,
  );
  TestValidator.equals(
    "snapshot postType is TEXT",
    retrievedSnapshot.postType,
    "TEXT",
  );
  TestValidator.equals(
    "snapshot textContent matches original post text",
    retrievedSnapshot.textContent,
    originalText,
  );
  TestValidator.equals(
    "snapshot linkUrl is null for TEXT post",
    retrievedSnapshot.linkUrl,
    null,
  );
  TestValidator.equals(
    "snapshot imageFileId is null for TEXT post",
    retrievedSnapshot.imageFileId,
    null,
  );
  TestValidator.predicate(
    "snapshot has valid createdAt timestamp",
    retrievedSnapshot.createdAt !== null,
  );
  // Validate relation objects
  TestValidator.equals(
    "snapshot post id matches",
    retrievedSnapshot.post.id,
    post.id,
  );
  TestValidator.equals(
    "snapshot post title matches",
    retrievedSnapshot.post.title,
    post.title,
  );
  TestValidator.equals(
    "snapshot post type matches",
    retrievedSnapshot.post.post_type,
    post.post_type,
  );
  TestValidator.equals(
    "snapshot member id matches author",
    retrievedSnapshot.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "snapshot member username matches",
    retrievedSnapshot.member.username,
    memberAuth.username,
  );
  TestValidator.equals(
    "snapshot community id matches",
    retrievedSnapshot.community.id,
    community.id,
  );
  TestValidator.equals(
    "snapshot community name matches",
    retrievedSnapshot.community.name,
    community.name,
  );
}
