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
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
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
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_snapshot } from "../../../prepare/prepare_random_reddit_clone_post_snapshot";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_post_snapshot_creation_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberAuth = await authorize_member_join(connection, {
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
  // 2. Create member-specific connection with auth token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // 3. Create community
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
  // 4. Subscribe to community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 5. Create TEXT type post
  const postTitle = RandomGenerator.paragraph({ sentences: 1 });
  const postBody = RandomGenerator.content({ paragraphs: 2 });
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: postTitle,
        post_type: "TEXT",
        community_id: community.id,
        text: {
          body: postBody,
        } satisfies IRedditClonePostText.ICreate,
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Create snapshot of the post
  const snapshot =
    await api.functional.redditClone.member.posts.snapshots.create(
      memberConnection,
      {
        postId: post.id,
        body: {} satisfies IRedditClonePostSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  // 7. Validate snapshot structure and content
  TestValidator.equals(
    "snapshot title matches post",
    snapshot.title,
    post.title,
  );
  TestValidator.equals("snapshot postType is TEXT", snapshot.postType, "TEXT");
  TestValidator.equals(
    "snapshot textContent matches post body",
    snapshot.textContent,
    post.body,
  );
  TestValidator.equals(
    "snapshot linkUrl is null for TEXT post",
    snapshot.linkUrl,
    null,
  );
  TestValidator.equals(
    "snapshot imageFileId is null for TEXT post",
    snapshot.imageFileId,
    null,
  );
  TestValidator.predicate(
    "snapshot createdAt is set",
    snapshot.createdAt !== null,
  );
  TestValidator.equals(
    "snapshot post relation matches",
    snapshot.post.id,
    post.id,
  );
  TestValidator.equals(
    "snapshot member relation matches author",
    snapshot.member.id,
    post.author.id,
  );
  TestValidator.equals(
    "snapshot community relation matches",
    snapshot.community.id,
    post.community.id,
  );
}
