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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubVote";
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

/**
 * Test vote list filtering by content type.
 *
 * Validates that the vote index endpoint correctly isolates vote records when filtered by `target_type`. A single member creates both a post vote and a comment vote, then queries the endpoint with each target type independently, confirming that only votes of the requested type appear in the results.
 *
 * Pagination metadata is validated on both queries to ensure the response structure remains correct when content type filters are applied alongside the pagination system.
 *
 * 1. A member registers and authenticates via `authorize_member_join`.
 * 2. The member creates a community and subscribes to it.
 * 3. A text post is created in the subscribed community.
 * 4. A top-level comment is added to the post.
 * 5. The member upvotes the post, generating a `target_type="post"` vote record.
 * 6. The member upvotes the comment, generating a `target_type="comment"` vote record.
 * 7. Vote index is queried with `target_type="post"` — validates only the post vote is returned with `value=1` and correct `target_id`.
 * 8. Vote index is queried with `target_type="comment"` — validates only the comment vote is returned with `value=1` and correct `target_id`.
 * 9. Pagination metadata (`current`, `limit`, `records`, `pages`) is validated on both query results.
 */
export async function test_api_vote_list_content_type_filtered(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Create a text post
  const post = await generate_random_community_hub_communities_posts_create(
    memberConnection,
    {
      body: { type: "text" },
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 5. Add a top-level comment on the post
  const comment = await generate_random_community_hub_posts_comments_create(
    memberConnection,
    { params: { postId: post.id } },
  );
  typia.assert(comment);
  // 6. Upvote the post
  const postVote = await api.functional.communityHub.member.posts.upvote(
    memberConnection,
    { postId: post.id },
  );
  typia.assert(postVote);
  // 7. Upvote the comment
  const commentVote = await api.functional.communityHub.member.comments.upvote(
    memberConnection,
    { commentId: comment.id },
  );
  typia.assert(commentVote);
  // 8. Query votes filtered by target_type="post"
  const postVotesPage = await api.functional.communityHub.member.votes.index(
    memberConnection,
    {
      body: {
        target_type: "post",
      } satisfies ICommunityHubVote.IRequest,
    },
  );
  typia.assert(postVotesPage);
  TestValidator.equals(
    "only one post vote returned",
    postVotesPage.data.length,
    1,
  );
  TestValidator.equals(
    "post vote value is upvote",
    postVotesPage.data[0].value,
    1,
  );
  TestValidator.equals(
    "post vote target_type is post",
    postVotesPage.data[0].target_type,
    "post",
  );
  TestValidator.equals(
    "post vote target_id matches the post",
    postVotesPage.data[0].target_id,
    post.id,
  );
  TestValidator.equals(
    "post votes pagination records",
    postVotesPage.pagination.records,
    1,
  );
  TestValidator.equals(
    "post votes pagination current page",
    postVotesPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "post votes pagination limit positive",
    postVotesPage.pagination.limit > 0,
  );
  TestValidator.equals(
    "post votes pagination total pages",
    postVotesPage.pagination.pages,
    1,
  );
  // 9. Query votes filtered by target_type="comment"
  const commentVotesPage = await api.functional.communityHub.member.votes.index(
    memberConnection,
    {
      body: {
        target_type: "comment",
      } satisfies ICommunityHubVote.IRequest,
    },
  );
  typia.assert(commentVotesPage);
  TestValidator.equals(
    "only one comment vote returned",
    commentVotesPage.data.length,
    1,
  );
  TestValidator.equals(
    "comment vote value is upvote",
    commentVotesPage.data[0].value,
    1,
  );
  TestValidator.equals(
    "comment vote target_type is comment",
    commentVotesPage.data[0].target_type,
    "comment",
  );
  TestValidator.equals(
    "comment vote target_id matches the comment",
    commentVotesPage.data[0].target_id,
    comment.id,
  );
  TestValidator.equals(
    "comment votes pagination records",
    commentVotesPage.pagination.records,
    1,
  );
  TestValidator.equals(
    "comment votes pagination current page",
    commentVotesPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "comment votes pagination limit positive",
    commentVotesPage.pagination.limit > 0,
  );
  TestValidator.equals(
    "comment votes pagination total pages",
    commentVotesPage.pagination.pages,
    1,
  );
}
