import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";

/**
 * Test that an admin can successfully fetch the detail of a specific vote on a
 * post (audit/compliance view).
 *
 * - Register an admin, capture admin token.
 * - Register a member, capture member token.
 * - Member creates a new community.
 * - Member creates a post in that community.
 * - Member votes (+1) on their post.
 * - Switch to admin account via authentication.
 * - Admin queries /communityPlatform/admin/posts/{postId}/votes/{voteId},
 *   supplying postId and voteId from prior steps.
 * - Validate proper ICommunityPlatformPostVote DTO is returned. Assert ownership,
 *   linkage, and vote_value (+1) on the response.
 * - Validate admin permission boundary (admin can always see the full detail for
 *   audit).
 */
export async function test_api_post_vote_detail_view_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(adminAuthorized);

  // 2. Register member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(10);
  const memberAuthorized = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAuthorized);

  // 3. Member creates a community
  const communityCreate = {
    name: RandomGenerator.name(2),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    slug: RandomGenerator.alphaNumeric(8),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityCreate,
      },
    );
  typia.assert(community);

  // 4. Member creates a post
  const postCreate = {
    community_platform_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 10 }),
    content_body: RandomGenerator.content({ paragraphs: 1 }),
    content_type: "text",
    status: "published",
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: postCreate,
    },
  );
  typia.assert(post);

  // 5. Member votes (+1) on the post
  const voteCreate = {
    vote_value: 1,
  } satisfies ICommunityPlatformPostVote.ICreate;
  const vote = await api.functional.communityPlatform.member.posts.votes.create(
    connection,
    {
      postId: post.id,
      body: voteCreate,
    },
  );
  typia.assert(vote);

  // 6. Switch authentication back to admin account
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });

  // 7. Admin retrieves vote detail
  const voteDetail =
    await api.functional.communityPlatform.admin.posts.votes.at(connection, {
      postId: post.id,
      voteId: vote.id,
    });
  typia.assert(voteDetail);

  // 8. Validate all returned references and property values
  TestValidator.equals("vote id matches", voteDetail.id, vote.id);
  TestValidator.equals(
    "vote is for correct post",
    voteDetail.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "voter id matches member",
    voteDetail.community_platform_member_id,
    memberAuthorized.id,
  );
  TestValidator.equals("vote_value is 1 (upvote)", voteDetail.vote_value, 1);
  TestValidator.equals("no delete timestamp", voteDetail.deleted_at, null);
  TestValidator.predicate(
    "vote timestamps are present",
    typeof voteDetail.created_at === "string" &&
      voteDetail.created_at.length > 0 &&
      typeof voteDetail.updated_at === "string" &&
      voteDetail.updated_at.length > 0,
  );
}
