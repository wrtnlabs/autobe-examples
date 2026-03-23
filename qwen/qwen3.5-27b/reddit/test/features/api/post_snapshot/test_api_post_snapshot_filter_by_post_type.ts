import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostSnapshot";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

export async function test_api_post_snapshot_filter_by_post_type(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test filtering post snapshots by post_type parameter.
   * Creates posts of different types (text, link, image), edits them to generate snapshots,
   * then verifies the post_type filter correctly returns only matching snapshots.
   */
  // 1. Create and authenticate member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create posts of different types
  const textPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        postType: "text",
        communityId: community.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(textPost);
  const linkPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        postType: "link",
        communityId: community.id,
        content: null,
      },
    },
  );
  typia.assert(linkPost);
  const imagePost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        postType: "image",
        communityId: community.id,
        content: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(imagePost);
  // 4. Edit each post to generate snapshots
  await api.functional.redditClone.member.posts.update(memberConnection, {
    postId: textPost.id,
    body: {
      title: textPost.title + " (updated)",
      content: textPost.content + "\n\n[Updated content]",
    },
  });
  await api.functional.redditClone.member.posts.update(memberConnection, {
    postId: linkPost.id,
    body: {
      title: linkPost.title + " (updated)",
    },
  });
  await api.functional.redditClone.member.posts.update(memberConnection, {
    postId: imagePost.id,
    body: {
      title: imagePost.title + " (updated)",
      content: imagePost.content + " [Updated]",
    },
  });
  // 5. Test filtering by post_type='text'
  const textSnapshots = await api.functional.redditClone.post_snapshots.index(
    memberConnection,
    {
      body: {
        post_type: "text",
        limit: 100,
      },
    },
  );
  typia.assert(textSnapshots);
  TestValidator.predicate(
    "text filter returns snapshots",
    textSnapshots.data.length > 0,
  );
  TestValidator.equals(
    "text filter pagination records",
    textSnapshots.pagination.records,
    textSnapshots.data.length,
  );
  for (const snapshot of textSnapshots.data) {
    TestValidator.equals(
      `snapshot post_type is 'text'`,
      snapshot.post_type,
      "text",
    );
  }
  // 6. Test filtering by post_type='link'
  const linkSnapshots = await api.functional.redditClone.post_snapshots.index(
    memberConnection,
    {
      body: {
        post_type: "link",
        limit: 100,
      },
    },
  );
  typia.assert(linkSnapshots);
  TestValidator.predicate(
    "link filter returns snapshots",
    linkSnapshots.data.length > 0,
  );
  TestValidator.equals(
    "link filter pagination records",
    linkSnapshots.pagination.records,
    linkSnapshots.data.length,
  );
  for (const snapshot of linkSnapshots.data) {
    TestValidator.equals(
      `snapshot post_type is 'link'`,
      snapshot.post_type,
      "link",
    );
  }
  // 7. Test filtering by post_type='image'
  const imageSnapshots = await api.functional.redditClone.post_snapshots.index(
    memberConnection,
    {
      body: {
        post_type: "image",
        limit: 100,
      },
    },
  );
  typia.assert(imageSnapshots);
  TestValidator.predicate(
    "image filter returns snapshots",
    imageSnapshots.data.length > 0,
  );
  TestValidator.equals(
    "image filter pagination records",
    imageSnapshots.pagination.records,
    imageSnapshots.data.length,
  );
  for (const snapshot of imageSnapshots.data) {
    TestValidator.equals(
      `snapshot post_type is 'image'`,
      snapshot.post_type,
      "image",
    );
  }
  // 8. Test combining post_type filter with post_id filter
  const textPostSnapshots =
    await api.functional.redditClone.post_snapshots.index(memberConnection, {
      body: {
        post_type: "text",
        post_id: textPost.id,
        limit: 100,
      },
    });
  typia.assert(textPostSnapshots);
  TestValidator.predicate(
    "combined filter returns snapshots for specific post",
    textPostSnapshots.data.length > 0,
  );
  for (const snapshot of textPostSnapshots.data) {
    TestValidator.equals(
      `snapshot belongs to correct post`,
      snapshot.reddit_clone_post_id,
      textPost.id,
    );
    TestValidator.equals(
      `snapshot post_type is 'text'`,
      snapshot.post_type,
      "text",
    );
  }
  // 9. Test with a post_type that has no snapshots (should return empty data)
  // This is a valid test since we only created text, link, and image posts
  // If we had a hypothetical "video" type, it would return empty
  // For now, we verify that filtering works correctly with existing types
  TestValidator.predicate(
    "all three post types have snapshots",
    textSnapshots.data.length > 0 &&
      linkSnapshots.data.length > 0 &&
      imageSnapshots.data.length > 0,
  );
}
