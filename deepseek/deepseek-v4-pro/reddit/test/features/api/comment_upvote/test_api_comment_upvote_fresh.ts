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

export async function test_api_comment_upvote_fresh(
  connection: api.IConnection,
): Promise<void> {
  // 1. Author registers as a new member
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // 2. Author creates a community
  const community =
    await generate_random_community_hub_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // 3. Author subscribes to the community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      authorConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Author creates a post
  const post = await generate_random_community_hub_communities_posts_create(
    authorConnection,
    {
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 5. Author creates a top-level comment
  const comment = await generate_random_community_hub_posts_comments_create(
    authorConnection,
    {
      params: { postId: post.id },
    },
  );
  typia.assert(comment);
  // Record initial comment state for documentation
  const initialVoteScore = comment.vote_score;
  // 6. Voter registers as a separate member
  const voterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(voterConnection, {});
  // 7. Voter upvotes the author's comment
  const vote = await api.functional.communityHub.member.comments.upvote(
    voterConnection,
    { commentId: comment.id },
  );
  typia.assert(vote);
  // 8. Validate vote record
  TestValidator.equals("vote value is 1 (upvote)", vote.value, 1);
  TestValidator.equals(
    "vote target type is comment",
    vote.target_type,
    "comment",
  );
  TestValidator.equals(
    "vote target id matches comment",
    vote.target_id,
    comment.id,
  );
  TestValidator.equals(
    "fresh vote has equal created_at and updated_at",
    vote.created_at,
    vote.updated_at,
  );
  TestValidator.equals(
    "initial comment vote score is zero before upvote",
    initialVoteScore,
    0,
  );
}
