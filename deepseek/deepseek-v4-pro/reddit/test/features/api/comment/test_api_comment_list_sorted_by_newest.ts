import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_communities_posts_create } from "../../../generate/generate_random_community_hub_communities_posts_create";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { generate_random_community_hub_posts_comments_create } from "../../../generate/generate_random_community_hub_posts_comments_create";
import { prepare_random_community_hub_comment } from "../../../prepare/prepare_random_community_hub_comment";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";

export async function test_api_comment_list_sorted_by_newest(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, { body: {} });
  // 2. Create a community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      { body: {} },
    );
  // 3. Subscribe to the community
  await api.functional.communityHub.member.communities.subscriptions.create(
    memberConnection,
    { communityName: community.name },
  );
  // 4. Create a text post in the community
  const post = await generate_random_community_hub_communities_posts_create(
    memberConnection,
    {
      body: { type: "text" },
      params: { communityName: community.name },
    },
  );
  // 5. Create multiple top-level comments with staggered delays
  const commentCount = 5;
  const delay = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));
  const createdComments: ICommunityHubComment[] = [];
  for (let i = 0; i < commentCount; i++) {
    await delay(200);
    const comment = await generate_random_community_hub_posts_comments_create(
      memberConnection,
      { params: { postId: post.id } },
    );
    createdComments.push(comment);
  }
  // 6. Retrieve comments via the list endpoint
  const comments = typia.assert<ICommunityHubComment.IList[]>(
    await api.functional.communityHub.posts.comments.list(
      memberConnection,
      { postId: post.id },
    ),
  );
  // 7. Validate sorting: newest first (created_at descending)
  for (let i = 0; i < comments.length - 1; i++) {
    TestValidator.predicate(
      `comment ${i} is newer than or equal to comment ${i + 1}`,
      comments[i].created_at >= comments[i + 1].created_at,
    );
  }
  // 8. Validate no nested replies exist
  for (const comment of comments) {
    TestValidator.equals(
      "childComments should be empty for top-level comments",
      comment.childComments.length,
      0,
    );
  }
  // 9. Validate comment count matches
  TestValidator.equals(
    "all created comments are returned",
    comments.length,
    commentCount,
  );
}
