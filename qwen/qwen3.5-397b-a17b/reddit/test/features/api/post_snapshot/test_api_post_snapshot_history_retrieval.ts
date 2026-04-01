import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostSnapshot";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostSnapshot";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test retrieving historical snapshots for a post that has been edited multiple times.
 * 1. Authenticate as member
 * 2. Create a community
 * 3. Subscribe to the community
 * 4. Create a text post
 * 5. Edit the post multiple times to generate snapshots
 * 6. Retrieve snapshots list and verify historical state
 * 7. Verify snapshots are ordered by created_at descending
 * 8. Validate pagination metadata
 */
export async function test_api_post_snapshot_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create a text post
  const originalTitle = RandomGenerator.paragraph({ sentences: 1 });
  const originalContent = RandomGenerator.content({ paragraphs: 2 });
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: originalTitle,
        post_type: "text",
        text_content: originalContent,
      },
    },
  );
  typia.assert(post);
  // 5. Edit the post multiple times to generate snapshots
  const edit1Title = RandomGenerator.paragraph({ sentences: 1 });
  const edit1Content = RandomGenerator.content({ paragraphs: 2 });
  await api.functional.redditCommunity.member.posts.update(memberConnection, {
    postId: post.id,
    body: {
      title: edit1Title,
      text_content: edit1Content,
    },
  });
  const edit2Title = RandomGenerator.paragraph({ sentences: 1 });
  const edit2Content = RandomGenerator.content({ paragraphs: 2 });
  await api.functional.redditCommunity.member.posts.update(memberConnection, {
    postId: post.id,
    body: {
      title: edit2Title,
      text_content: edit2Content,
    },
  });
  const edit3Title = RandomGenerator.paragraph({ sentences: 1 });
  const edit3Content = RandomGenerator.content({ paragraphs: 2 });
  await api.functional.redditCommunity.member.posts.update(memberConnection, {
    postId: post.id,
    body: {
      title: edit3Title,
      text_content: edit3Content,
    },
  });
  // 6. Retrieve snapshots list
  const snapshotsResponse =
    await api.functional.redditCommunity.member.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
          order: "desc",
        },
      },
    );
  typia.assert(snapshotsResponse);
  // 7. Validate pagination metadata
  TestValidator.predicate(
    "has pagination",
    snapshotsResponse.pagination !== undefined,
  );
  TestValidator.equals("current page", snapshotsResponse.pagination.current, 1);
  TestValidator.predicate(
    "limit is valid",
    snapshotsResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "records count is valid",
    snapshotsResponse.pagination.records >= 4,
  );
  TestValidator.predicate(
    "pages calculation correct",
    snapshotsResponse.pagination.pages >= 1,
  );
  // 8. Validate snapshots data
  TestValidator.predicate(
    "has data array",
    snapshotsResponse.data !== undefined,
  );
  TestValidator.predicate(
    "has at least 4 snapshots",
    snapshotsResponse.data.length >= 4,
  );
  // 9. Verify each snapshot has required fields via typia.assert
  for (const snapshot of snapshotsResponse.data) {
    typia.assert(snapshot);
    TestValidator.predicate(
      "snapshot post_type is text",
      snapshot.post_type === "text",
    );
  }
  // 10. Verify snapshots are ordered by created_at descending (most recent first)
  if (snapshotsResponse.data.length >= 2) {
    const firstSnapshot = snapshotsResponse.data[0];
    const lastSnapshot =
      snapshotsResponse.data[snapshotsResponse.data.length - 1];
    TestValidator.predicate(
      "snapshots ordered by created_at descending",
      new Date(firstSnapshot.created_at).getTime() >=
        new Date(lastSnapshot.created_at).getTime(),
    );
  }
  // 11. Verify the most recent snapshot matches the last edit
  if (snapshotsResponse.data.length > 0) {
    const mostRecentSnapshot = snapshotsResponse.data[0];
    TestValidator.equals(
      "most recent snapshot title matches last edit",
      mostRecentSnapshot.title,
      edit3Title,
    );
  }
}
