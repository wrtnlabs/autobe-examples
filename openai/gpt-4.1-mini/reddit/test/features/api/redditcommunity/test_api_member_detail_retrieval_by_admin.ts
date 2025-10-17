import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunityModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityModerators";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerators";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

export async function test_api_member_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registration
  const adminBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: "StrongP@ssw0rd123",
  } satisfies IRedditCommunityAdmin.ICreate;
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminBody });
  typia.assert(admin);

  // 2. Admin login to authenticate
  const adminLoginBody = {
    email: adminBody.email,
    password: adminBody.password,
  } satisfies IRedditCommunityAdmin.ILogin;
  const loggedInAdmin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(loggedInAdmin);

  // 3. Create reddit community as prerequisite
  const communityBody = {
    name: `community_${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 4. Assign community moderators
  const modSearchRequest = {
    page: 1,
    limit: 10,
    memberId: undefined,
    communityId: null,
    assignedAfter: null,
    assignedBefore: null,
    search: undefined,
  } satisfies IRedditCommunityCommunityModerators.IRequest;
  const moderatorsPage: IPageIRedditCommunityCommunityModerators.ISummary =
    await api.functional.redditCommunity.admin.redditCommunityCommunityModerators.search(
      connection,
      { body: modSearchRequest },
    );
  typia.assert(moderatorsPage);

  // 5. Member user registration
  const memberBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: "MemberP@ssw0rd!",
  } satisfies IRedditCommunityMember.ICreate;
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberBody });
  typia.assert(member);

  // 6. Admin retrieves specific reddit community member detail by member ID
  const memberDetails: IRedditCommunityMember =
    await api.functional.redditCommunity.admin.redditCommunityMembers.at(
      connection,
      { id: member.id },
    );
  typia.assert(memberDetails);

  // 7. Validate key member information fields
  TestValidator.equals("member id matches", memberDetails.id, member.id);
  TestValidator.equals(
    "member email matches",
    memberDetails.email,
    member.email,
  );
  TestValidator.predicate(
    "email is verified or not boolean",
    typeof memberDetails.is_email_verified === "boolean",
  );
  TestValidator.predicate(
    "created_at is valid ISO date",
    !isNaN(Date.parse(memberDetails.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    !isNaN(Date.parse(memberDetails.updated_at)),
  );

  // 8. Validate password_hash presence and non-empty
  TestValidator.predicate(
    "password_hash present and non-empty",
    typeof memberDetails.password_hash === "string" &&
      memberDetails.password_hash.length > 0,
  );

  // 9. Optionally validate community moderators are subset or empty
  if (
    memberDetails.reddit_community_community_moderators !== undefined &&
    memberDetails.reddit_community_community_moderators !== null
  ) {
    TestValidator.predicate(
      "moderators is array",
      Array.isArray(memberDetails.reddit_community_community_moderators),
    );
  }

  // 10. Validate no unauthorized leakage by checking only known props exist
  const allowedProps = new Set([
    "id",
    "email",
    "password_hash",
    "is_email_verified",
    "created_at",
    "updated_at",
    "deleted_at",
    "reddit_community_community_moderators",
    "reddit_community_posts",
    "reddit_community_comments",
    "reddit_community_post_votes",
    "reddit_community_comment_votes",
    "reddit_community_user_karma",
    "reddit_community_community_subscriptions",
    "reddit_community_reports_of_reporter_member_id",
    "reddit_community_reports_of_reported_member_id",
    "reddit_community_report_actions",
    "reddit_community_user_profiles",
  ]);
  TestValidator.predicate(
    "no unexpected properties",
    Object.keys(memberDetails).every((key) => allowedProps.has(key)),
  );
}
