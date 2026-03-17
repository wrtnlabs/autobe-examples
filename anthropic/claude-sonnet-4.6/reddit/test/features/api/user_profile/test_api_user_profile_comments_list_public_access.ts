import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import type { ICommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityUserProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityComment";
import type { IPageICommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_user_profile_comments_list_public_access(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================
  // SETUP: Create actor-specific connections
  // ============================================================
  // Member connection - will get Authorization set by authorize_member_join
  const memberConnection: api.IConnection = { host: connection.host };
  // Public connection - no Authorization header (unauthenticated)
  const publicConnection: api.IConnection = { host: connection.host };
  // ============================================================
  // STEP 1: Register a new member (the comment author)
  // ============================================================
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // ============================================================
  // STEP 2: Create a community as the member
  // ============================================================
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // ============================================================
  // STEP 3: Subscribe the member to the community
  // ============================================================
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // ============================================================
  // STEP 4: Create a post in the community
  // ============================================================
  const post = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // ============================================================
  // STEP 5: Create 3 comments on the post
  // ============================================================
  const commentCount = 3;
  const createdComments = await ArrayUtil.asyncRepeat(
    commentCount,
    async () => {
      const comment =
        await generate_random_community_member_posts_comments_create(
          memberConnection,
          {
            params: { postId: post.id },
          },
        );
      typia.assert(comment);
      return comment;
    },
  );
  // ============================================================
  // STEP 6: Find the user profile associated with the member
  // (using public connection - no auth required)
  // ============================================================
  const profilePage = await api.functional.community.userProfiles.index(
    publicConnection,
    {
      body: {
        search: memberAuth.username,
      } satisfies ICommunityUserProfile.IRequest,
    },
  );
  typia.assert(profilePage);
  // Find the profile matching the registered member
  const memberProfile = profilePage.data.find(
    (profile) => profile.community_member_id === memberAuth.id,
  );
  TestValidator.predicate(
    "member profile found in user profiles list",
    memberProfile !== undefined,
  );
  // Use non-null assertion after guard
  const userProfileId = memberProfile!.id;
  // ============================================================
  // STEP 7: Retrieve comment history WITHOUT authentication
  // (public access test - the core of this test)
  // ============================================================
  const commentPage =
    await api.functional.community.userProfiles.comments.index(
      publicConnection,
      {
        userProfileId,
        body: {} satisfies ICommunityComment.IRequest,
      },
    );
  typia.assert(commentPage);
  // ============================================================
  // STEP 8: Validate pagination metadata
  // ============================================================
  TestValidator.equals(
    "pagination current page is 1",
    commentPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20 (default)",
    commentPage.pagination.limit,
    20,
  );
  TestValidator.equals(
    "records count equals number of comments created",
    commentPage.pagination.records,
    commentCount,
  );
  TestValidator.predicate(
    "data array length matches comment count",
    commentPage.data.length === commentCount,
  );
  // ============================================================
  // STEP 9: Validate each comment in the data array
  // ============================================================
  for (const commentSummary of commentPage.data) {
    // Author matches the registered member
    TestValidator.equals(
      "comment author username matches registered member",
      commentSummary.author.username,
      memberAuth.username,
    );
    TestValidator.equals(
      "comment author id matches registered member",
      commentSummary.author.id,
      memberAuth.id,
    );
    // Top-level comment: parent_id is null
    TestValidator.equals(
      "comment parent_id is null (top-level)",
      commentSummary.parent_id,
      null,
    );
    // Vote score is 0 (no votes cast)
    TestValidator.equals(
      "comment vote_score is 0",
      commentSummary.vote_score,
      0,
    );
    // Reply count is 0 (no replies)
    TestValidator.equals(
      "comment reply_count is 0",
      commentSummary.reply_count,
      0,
    );
    // Content is non-empty
    TestValidator.predicate(
      "comment content is non-empty",
      commentSummary.content.length > 0,
    );
    // Post reference matches the created post
    TestValidator.equals(
      "comment post id matches created post",
      commentSummary.post.id,
      post.id,
    );
  }
  // ============================================================
  // STEP 10: Verify default sorting is by creation time descending
  // (most recent comment appears first)
  // ============================================================
  // Find the created comment IDs in order of creation
  const createdCommentIds = createdComments.map((c) => c.id);
  const returnedCommentIds = commentPage.data.map((c) => c.id);
  // The last created comment should appear first (descending by created_at)
  // Check that the returned order is roughly reversed from creation order
  // (we check that the most recently created comment - last in createdComments - appears first)
  TestValidator.predicate(
    "most recently created comment appears first (descending sort)",
    returnedCommentIds[0] === createdCommentIds[createdCommentIds.length - 1],
  );
}
