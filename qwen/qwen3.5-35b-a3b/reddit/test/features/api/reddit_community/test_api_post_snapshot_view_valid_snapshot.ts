import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IPageIRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostSnapshot";
import type { IPageIRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySubscription";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostSnapshot";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
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

export async function test_api_post_snapshot_view_valid_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Browse communities and subscribe to one
  const communities = await api.functional.redditCommunity.communities.index(
    memberConnection,
    {
      body: { limit: 10 },
    },
  );
  typia.assert(communities);
  TestValidator.predicate("communities exist", communities.data.length > 0);
  const community = communities.data[0];
  const subscriptions =
    await api.functional.redditCommunity.member.subscriptions.index(
      memberConnection,
      {
        body: { communityName: community.name },
      },
    );
  typia.assert(subscriptions);
  // 3. Create initial text post (triggers first snapshot on creation)
  const initialTitle = RandomGenerator.name(3);
  const initialBody = RandomGenerator.paragraph({ sentences: 3 });
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: initialTitle,
        post_type: "text" as const,
        body: initialBody,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  const authorUsername = post.author.username;
  // 4. Edit post twice to create additional snapshots
  const edit1Title = RandomGenerator.name(3);
  const edit1Body = RandomGenerator.paragraph({ sentences: 4 });
  const postEdit1 = await api.functional.redditCommunity.member.posts.update(
    memberConnection,
    {
      postId: post.id,
      body: {
        title: edit1Title,
        text_post_body: edit1Body,
      } satisfies IRedditCommunityPost.IUpdate,
    },
  );
  typia.assert(postEdit1);
  const edit2Title = RandomGenerator.name(3);
  const edit2Body = RandomGenerator.paragraph({ sentences: 5 });
  const postEdit2 = await api.functional.redditCommunity.member.posts.update(
    memberConnection,
    {
      postId: post.id,
      body: {
        title: edit2Title,
        text_post_body: edit2Body,
      } satisfies IRedditCommunityPost.IUpdate,
    },
  );
  typia.assert(postEdit2);
  // 5. Retrieve all snapshots for the post
  const snapshotsList =
    await api.functional.redditCommunity.posts.snapshots.index(
      connection, // Public endpoint, no auth needed
      {
        postId: post.id,
        body: {},
      },
    );
  typia.assert(snapshotsList);
  TestValidator.predicate(
    "at least 3 snapshots",
    snapshotsList.data.length >= 3,
  );
  // 6. Retrieve each individual snapshot and validate
  for (const snapshotSummary of snapshotsList.data) {
    const snapshot = await api.functional.redditCommunity.posts.snapshots.at(
      connection, // Public endpoint, no auth needed
      {
        postId: post.id,
        snapshotId: snapshotSummary.id,
      },
    );
    typia.assert(snapshot);
    // Validate snapshot ID matches path parameter
    TestValidator.equals(
      "snapshot ID matches",
      snapshot.id,
      snapshotSummary.id,
    );
    // Validate post ID association is correct
    TestValidator.equals(
      "post ID matches",
      snapshot.redditCommunityPostId,
      post.id,
    );
    // Validate editedByMember contains member information
    TestValidator.predicate(
      "editedByMember exists",
      snapshot.editedByMember !== null,
    );
    TestValidator.equals(
      "editedByMember username",
      snapshot.editedByMember.username,
      authorUsername,
    );
    TestValidator.equals(
      "editedByMember.id exists",
      snapshot.editedByMember.id !== undefined,
      true,
    );
    // Validate captured state matches snapshot timestamp
    TestValidator.equals(
      "snapshot title",
      snapshot.title,
      snapshotSummary.title,
    );
    TestValidator.equals(
      "snapshot postType",
      snapshot.postType,
      snapshotSummary.post_type,
    );
    TestValidator.equals(
      "snapshot voteScore",
      snapshot.voteScore,
      snapshotSummary.vote_score,
    );
    TestValidator.equals(
      "snapshot commentCount",
      snapshot.commentCount,
      snapshotSummary.comment_count,
    );
    // Validate textBody for text posts
    if (snapshot.postType === "text") {
      TestValidator.equals(
        "snapshot textBody",
        snapshot.textBody,
        snapshotSummary.text_body,
      );
    }
    // Validate linkUrl for link posts
    if (snapshot.postType === "link") {
      TestValidator.equals(
        "snapshot linkUrl",
        snapshot.linkUrl,
        typia.assert<string & tags.Format<"uri">>(snapshotSummary.link_url),
      );
    }
    // Validate imageFileId for image posts
    if (snapshot.postType === "image") {
      TestValidator.equals(
        "snapshot imageFileId",
        snapshot.imageFileId,
        snapshotSummary.image_file_id,
      );
    }
    // Validate createdAt timestamp
    TestValidator.predicate(
      "snapshot createdAt exists",
      snapshot.createdAt !== undefined,
    );
    // Validate post reference
    TestValidator.equals("post ID in reference", snapshot.post.id, post.id);
  }
}