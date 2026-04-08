import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import type { IRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";

export async function test_api_post_snapshot_deleted_post_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for authentication
  const joinConnection: api.IConnection = { host: connection.host };
  const joinedMember = await authorize_member_join(joinConnection, {
    body: {},
  });
  typia.assert(joinedMember);
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: joinedMember.email,
      password: "1234",
      href: "",
      referrer: "",
    },
  });
  // 2. Generate a random community ID for post creation
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create a test post
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        post_type: "text",
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        text_content: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 15,
        }),
        reddit_community_community_id: communityId,
      },
    },
  );
  typia.assert(post);
  const postId = post.id;
  const initialTitle = post.title;
  const initialContent = post.text_content;
  // 4. Create a random snapshot ID for testing
  // In real scenario, snapshots are generated automatically when post is modified
  // For this test, we verify that snapshot endpoint works correctly with post deletion
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 5. Delete the original post
  const deleteConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(deleteConnection, {
    body: {
      email: joinedMember.email,
      password: "1234",
      href: "",
      referrer: "",
    },
  });
  await api.functional.redditCommunity.member.posts.erase(deleteConnection, {
    postId: postId,
  });
  // 6. Verify that snapshot can still be retrieved even after post deletion
  // This tests that snapshots store denormalized data and are independent of parent post state
  const snapshot = await api.functional.redditCommunity.posts.snapshots.at(
    memberConnection,
    {
      postId: postId,
      snapshotId: snapshotId,
    },
  );
  typia.assert(snapshot);
  // 7. Validate snapshot data structure
  TestValidator.equals("snapshot has title", snapshot.title, initialTitle);
  TestValidator.equals(
    "snapshot has content",
    snapshot.content,
    initialContent,
  );
  TestValidator.equals("snapshot type matches", snapshot.post_type, "text");
  TestValidator.equals(
    "snapshot has author",
    snapshot.author.id,
    joinedMember.id,
  );
  TestValidator.predicate(
    "snapshot has community info",
    snapshot.community !== undefined,
  );
  TestValidator.equals("snapshot status is active", snapshot.status, "active");
  // 8. Verify snapshot remains accessible independently of parent post
  // Try to retrieve the same snapshot again to ensure immutability
  const snapshotAgain = await api.functional.redditCommunity.posts.snapshots.at(
    memberConnection,
    {
      postId: postId,
      snapshotId: snapshotId,
    },
  );
  typia.assert(snapshotAgain);
  TestValidator.equals(
    "snapshot is immutable",
    snapshotAgain.title,
    snapshot.title,
  );
  TestValidator.equals(
    "snapshot content unchanged",
    snapshotAgain.content,
    snapshot.content,
  );
  TestValidator.equals(
    "snapshot status preserved",
    snapshotAgain.status,
    snapshot.status,
  );
}