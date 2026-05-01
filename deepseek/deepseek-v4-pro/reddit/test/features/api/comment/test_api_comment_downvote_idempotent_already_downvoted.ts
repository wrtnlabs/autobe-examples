import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
import type { ICommunityHubVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubVote";
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

export async function test_api_comment_downvote_idempotent_already_downvoted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe member to the community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Create a text post in the community
  const post = await generate_random_community_hub_communities_posts_create(
    memberConnection,
    {
      body: { type: "text" },
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 5. Create a top-level comment on the post
  const comment = await generate_random_community_hub_posts_comments_create(
    memberConnection,
    { params: { postId: post.id } },
  );
  typia.assert(comment);
  // 6. First downvote on the comment
  const firstVote = await api.functional.communityHub.member.comments.downvote(
    memberConnection,
    { commentId: comment.id },
  );
  typia.assert(firstVote);
  // 7. Second downvote on the same comment (idempotent)
  const secondVote = await api.functional.communityHub.member.comments.downvote(
    memberConnection,
    { commentId: comment.id },
  );
  typia.assert(secondVote);
  // 8. Validate idempotent behavior — second vote record is identical to the first
  TestValidator.equals("vote id unchanged", secondVote.id, firstVote.id);
  TestValidator.equals("value remains -1", secondVote.value, -1);
  TestValidator.equals(
    "created_at unchanged",
    secondVote.created_at,
    firstVote.created_at,
  );
  TestValidator.equals(
    "updated_at unchanged",
    secondVote.updated_at,
    firstVote.updated_at,
  );
}
