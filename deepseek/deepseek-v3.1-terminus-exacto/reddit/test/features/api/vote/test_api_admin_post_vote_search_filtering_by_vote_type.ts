import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";

/**
 * Test vote search filtering specifically by vote direction (upvote/downvote).
 * An administrator searches for votes on a post filtering specifically by
 * upvotes to analyze positive engagement patterns, then switches to downvotes
 * to examine negative feedback. Validates that vote type filtering accurately
 * separates positive and negative assessments, enabling administrators to
 * understand community sentiment and identify potential content quality issues
 * or controversial discussions that require moderation attention.
 */
export async function test_api_admin_post_vote_search_filtering_by_vote_type(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "content",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create member user for voting
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPassword123!";

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        ip: undefined,
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 3. Create a mock community ID for post creation
  const communityId = typia.random<string & tags.Format<"uuid">>();

  // 4. Create target post for voting
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: communityId,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 5. Create mixed vote types (upvotes and downvotes)
  const upvote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          vote_type: "upvote",
          actor_type: "member",
          content_type: "post",
          status: "active",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(upvote);

  const downvote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          vote_type: "downvote",
          actor_type: "member",
          content_type: "post",
          status: "active",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(downvote);

  // 6. Switch to admin account for vote search
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "Mozilla/5.0",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // 7. Test vote search with upvote filtering
  const upvoteResults: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.admin.posts.votes.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 10,
        vote_type: "upvote",
        actor_type: "member",
        content_type: "post",
        status: "active",
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(upvoteResults);

  // Validate upvote filtering returns only upvotes
  TestValidator.equals(
    "upvote filter should return only upvotes",
    upvoteResults.data.every((vote) => vote.vote_type === "upvote"),
    true,
  );

  // 8. Test vote search with downvote filtering
  const downvoteResults: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.admin.posts.votes.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 10,
        vote_type: "downvote",
        actor_type: "member",
        content_type: "post",
        status: "active",
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(downvoteResults);

  // Validate downvote filtering returns only downvotes
  TestValidator.equals(
    "downvote filter should return only downvotes",
    downvoteResults.data.every((vote) => vote.vote_type === "downvote"),
    true,
  );

  // 9. Validate vote type separation
  TestValidator.predicate(
    "upvote and downvote results should be mutually exclusive",
    upvoteResults.data.length > 0 && downvoteResults.data.length > 0,
  );

  TestValidator.notEquals(
    "upvote and downvote results should have different content",
    upvoteResults.data,
    downvoteResults.data,
  );
}
