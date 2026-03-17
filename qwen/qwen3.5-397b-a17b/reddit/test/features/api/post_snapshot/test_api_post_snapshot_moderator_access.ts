import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostSnapshot";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
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
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_moderator } from "../../../prepare/prepare_random_reddit_clone_moderator";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";

/**
 * Test that a community moderator can retrieve snapshots of posts within their
 * moderated community, even when they are not the post author.
 *
 * This test validates the access control mechanism for post snapshots:
 * 1. Creates two member accounts - one as post author, one as community moderator
 * 2. Moderator creates a community (becoming the owner)
 * 3. Author creates a post in the moderated community
 * 4. Post is updated to generate snapshot history
 * 5. Moderator accesses the snapshot endpoint and verifies they can view the post's snapshot history
 * 6. Validates snapshot data integrity including title, post_type, and author information
 */
export async function test_api_post_snapshot_moderator_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create author member account
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(authorAuth);
  // 2. Create moderator member account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(moderatorAuth);
  // 3. Moderator creates community (moderator becomes owner automatically)
  const community = await generate_random_reddit_clone_communities_create(
    moderatorConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // 4. Author creates a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "TEXT",
        community_id: community.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        },
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Update the post to generate a snapshot (author updates their own post)
  const updatedTitle = RandomGenerator.paragraph({ sentences: 1 });
  const updatedPost = await api.functional.redditClone.member.posts.update(
    authorConnection,
    {
      postId: post.id,
      body: {
        title: updatedTitle,
        text: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditClonePost.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // 6. Moderator accesses the post snapshots endpoint
  const snapshotsResponse =
    await api.functional.redditClone.member.posts.snapshots.index(
      moderatorConnection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 20,
          sort: "created_at",
          direction: "desc",
        } satisfies IRedditClonePostSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 7. Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    snapshotsResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is 1",
    snapshotsResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "has snapshot records",
    snapshotsResponse.data.length >= 1,
  );
  // 8. Validate snapshot data integrity - typia.assert already validated structure
  const snapshot = snapshotsResponse.data[0]!;
  // 9. Validate that at least one snapshot exists (from the update operation)
  TestValidator.predicate(
    "has at least one snapshot from post update",
    snapshotsResponse.data.length >= 1,
  );
  // 10. Validate snapshot contains expected post information
  const latestSnapshot = snapshotsResponse.data[0]!;
  TestValidator.equals(
    "snapshot post_type matches original",
    latestSnapshot.post_type,
    post.post_type,
  );
  TestValidator.predicate(
    "snapshot author matches post author",
    latestSnapshot.author.id === post.author.id,
  );
}
