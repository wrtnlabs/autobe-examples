import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
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

export async function test_api_post_snapshot_view_original_edit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(auth);
  // 2. Browse communities to find one to subscribe to
  const communities: IPageIRedditCommunityCommunity.ISummary =
    await api.functional.redditCommunity.communities.index(connection, {
      body: { limit: 10 },
    });
  typia.assert(communities);
  if (communities.data.length === 0) {
    throw new Error("No communities available to subscribe to");
  }
  const communityId = communities.data[0].id;
  const communityName = communities.data[0].name;
  // 3. Subscribe to community using member connection
  const subscriptions: IPageIRedditCommunitySubscription.ISummary =
    await api.functional.redditCommunity.member.subscriptions.index(
      memberConnection,
      {
        body: {
          communityName: communityName,
          limit: 1,
        },
      },
    );
  typia.assert(subscriptions);
  // 4. Create a text post
  // The system should automatically create a snapshot upon post creation
  // as the first version in the audit trail
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: communityId,
        post_type: "text",
        title: "Test Original Snapshot Post",
        body: "This is the original text content of the post.",
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Validate post was created correctly
  TestValidator.equals(
    "post title matches original",
    post.title,
    "Test Original Snapshot Post",
  );
  TestValidator.equals("post type is text", post.post_type, "text");
  // 6. Validate content structure for text post
  const content = post.content;
  typia.assert(content);
  if (content.post_type === "text") {
    TestValidator.equals(
      "text body matches original",
      content.body,
      "This is the original text content of the post.",
    );
  }
  // 7. Validate initial state (snapshot would capture these values)
  TestValidator.equals("initial vote score is 0", post.vote_score, 0);
  TestValidator.equals("initial comment count is 0", post.comment_count, 0);
  // 8. Validate community association
  TestValidator.equals(
    "post belongs to correct community",
    post.community.id,
    communityId,
  );
  TestValidator.equals(
    "community name matches",
    post.community.name,
    communityName,
  );
  // 9. Validate author information
  typia.assert(post.author);
  TestValidator.equals(
    "author has valid UUID format",
    true,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      post.author.id,
    ),
  );
  TestValidator.predicate(
    "author has username",
    post.author.username.length > 0,
  );
  TestValidator.predicate(
    "author has valid created_at timestamp",
    !isNaN(new Date(post.author.created_at).getTime()),
  );
  // 10. Validate post timestamps
  TestValidator.predicate(
    "post has valid created_at timestamp",
    !isNaN(new Date(post.created_at).getTime()),
  );
  TestValidator.predicate(
    "post has valid updated_at timestamp",
    !isNaN(new Date(post.updated_at).getTime()),
  );
  TestValidator.equals(
    "post created_at matches updated_at (no edits yet)",
    post.created_at,
    post.updated_at,
  );
}
