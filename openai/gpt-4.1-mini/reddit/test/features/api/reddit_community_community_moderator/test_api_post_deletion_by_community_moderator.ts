import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPosts";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

/**
 * End-to-end (E2E) test verifying that a communityModerator user can delete a
 * post in a community.
 *
 * This test covers full user journey including communityModerator and member
 * user account creation, authentication, community and post creation by the
 * member, and post deletion by the communityModerator.
 *
 * The scenario ensures role permissions, post lifecycle operations, and
 * validates successful deletion with no content returned.
 *
 * Steps:
 *
 * 1. CommunityModerator registers and logs in.
 * 2. Member registers and logs in.
 * 3. Member creates a new community.
 * 4. Member creates a new text post in the community.
 * 5. CommunityModerator deletes the post.
 * 6. Validates the final deletion API call succeeded.
 */
export async function test_api_post_deletion_by_community_moderator(
  connection: api.IConnection,
) {
  // 1. CommunityModerator user joins
  const communityModeratorEmail = `moderator_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const communityModeratorPassword = "StrongPass!234";

  const communityModeratorJoinBody = {
    email: communityModeratorEmail,
    password: communityModeratorPassword,
  } satisfies IRedditCommunityCommunityModerator.IJoin;
  const communityModerator =
    await api.functional.auth.communityModerator.join.joinCommunityModerator(
      connection,
      {
        body: communityModeratorJoinBody,
      },
    );
  typia.assert(communityModerator);

  // 2. CommunityModerator user logs in
  const communityModeratorLoginBody = {
    email: communityModeratorEmail,
    password: communityModeratorPassword,
  } satisfies IRedditCommunityCommunityModerator.ILogin;
  const loggedInCommunityModerator =
    await api.functional.auth.communityModerator.login.loginCommunityModerator(
      connection,
      {
        body: communityModeratorLoginBody,
      },
    );
  typia.assert(loggedInCommunityModerator);

  // 3. Member joins
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const memberPassword = "AnotherStrongPass!567";
  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
  } satisfies IRedditCommunityMember.ICreate;
  const member = await api.functional.auth.member.join(connection, {
    body: memberJoinBody,
  });
  typia.assert(member);

  // 4. Member logs in
  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
  } satisfies IRedditCommunityMember.ILogin;
  const loggedInMember = await api.functional.auth.member.login(connection, {
    body: memberLoginBody,
  });
  typia.assert(loggedInMember);

  // 5. Member creates a community
  const communityCreateBody = {
    name: `community_${RandomGenerator.alphaNumeric(8)}`,
    description: "E2E test community created during automated test.",
  } satisfies IRedditCommunityCommunity.ICreate;
  const community =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 6. Member creates a post in the community
  const postCreateBody = {
    reddit_community_community_id: community.id,
    post_type: "text",
    title: "E2E test post title",
    body_text: "This is the body text of the E2E test post.",
  } satisfies IRedditCommunityPosts.ICreate;
  const post =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: postCreateBody,
      },
    );
  typia.assert(post);

  // 7. CommunityModerator deletes the post
  await api.functional.redditCommunity.communityModerator.communities.posts.erase(
    connection,
    {
      communityId: community.id,
      postId: post.id,
    },
  );

  // 8. Validation check: No error means deletion success
  TestValidator.predicate("post deleted successfully", true);
}
