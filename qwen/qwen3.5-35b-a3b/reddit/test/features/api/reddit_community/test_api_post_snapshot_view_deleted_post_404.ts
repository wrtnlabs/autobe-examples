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

export async function test_api_post_snapshot_view_deleted_post_404(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
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
  // 2. Browse communities to find one to subscribe to
  const communitiesResponse =
    await api.functional.redditCommunity.communities.index(memberConnection, {
      body: {
        page: 1,
        limit: 10,
      },
    });
  typia.assert(communitiesResponse);
  TestValidator.predicate(
    "communities exist",
    communitiesResponse.data.length > 0,
  );
  const targetCommunity = communitiesResponse.data[0];
  // 3. Subscribe to the community
  await api.functional.redditCommunity.member.subscriptions.index(
    memberConnection,
    {
      body: {
        communityName: targetCommunity.name,
      },
    },
  );
  // 4. Create a post in the subscribed community
  const createdPost = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        community_id: targetCommunity.id,
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(createdPost);
  // 5. Edit the post twice to generate multiple snapshots
  const firstEdit = await api.functional.redditCommunity.member.posts.update(
    memberConnection,
    {
      postId: createdPost.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        text_post_body: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditCommunityPost.IUpdate,
    },
  );
  typia.assert(firstEdit);
  const secondEdit = await api.functional.redditCommunity.member.posts.update(
    memberConnection,
    {
      postId: createdPost.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        text_post_body: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditCommunityPost.IUpdate,
    },
  );
  typia.assert(secondEdit);
  // 6. Retrieve snapshot IDs from the audit trail
  const snapshotsList =
    await api.functional.redditCommunity.posts.snapshots.index(
      memberConnection,
      {
        postId: createdPost.id,
        body: {
          page: 1,
          limit: 100,
        },
      },
    );
  typia.assert(snapshotsList);
  TestValidator.predicate("snapshots exist", snapshotsList.data.length >= 2);
  // 7. Delete the post (which should cascade delete all snapshots)
  await api.functional.redditCommunity.member.posts.erase(memberConnection, {
    postId: createdPost.id,
  });
  // 8. Validate that snapshots are now inaccessible (404 Not Found)
  const snapshotIds = snapshotsList.data.map((s) => s.id);
  for (const snapshotId of snapshotIds) {
    await TestValidator.error(
      `snapshot ${snapshotId} should be inaccessible after post deletion`,
      async () => {
        await api.functional.redditCommunity.posts.snapshots.at(
          memberConnection,
          {
            postId: createdPost.id,
            snapshotId,
          },
        );
      },
    );
  }
}
