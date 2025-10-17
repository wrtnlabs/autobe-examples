import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMember";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

/**
 * This E2E test validates that an administrator can successfully search for
 * reddit community members with filters and pagination. The scenario covers the
 * complete multi-role authentication flow for both admin and member users,
 * community creation by a member user, and the paginated filtered search of
 * members executed by the admin.
 *
 * Steps:
 *
 * 1. Admin user joins (registers) and logs in.
 * 2. Member user joins (registers) and logs in.
 * 3. Member user creates a community.
 * 4. Admin performs a filtered and paginated search for reddit community members
 *    by email and email verification status.
 * 5. Validate pagination and filtering correctness.
 */
export async function test_api_admin_member_search(
  connection: api.IConnection,
) {
  // 1. Admin user joins
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "securePass123";
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin logs in
  const adminLogin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditCommunityAdmin.ILogin,
    });
  typia.assert(adminLogin);

  // 3. Member user joins
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword = "memberPass123";
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // 4. Member user logs in
  const memberLogin: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditCommunityMember.ILogin,
    });
  typia.assert(memberLogin);

  // 5. Member creates a community
  const uniqueCommunityName = `community_${RandomGenerator.alphaNumeric(8)}`;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: {
          name: uniqueCommunityName,
          description: `This is a test community: ${uniqueCommunityName}`,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 6. Admin performs paginated, filtered search for reddit community members
  // Filter by memberEmail and is_email_verified true
  const page = 1;
  const limit = 10;
  const filterRequest = {
    page,
    limit,
    email: memberEmail,
    is_email_verified: true,
    created_at_from: null,
    created_at_to: null,
  } satisfies IRedditCommunityMember.IRequest;

  const result: IPageIRedditCommunityMember.ISummary =
    await api.functional.redditCommunity.admin.redditCommunityMembers.index(
      connection,
      { body: filterRequest },
    );
  typia.assert(result);

  // 7. Validate pagination data
  TestValidator.predicate(
    "page number is correct",
    result.pagination.current === page,
  );

  TestValidator.predicate(
    "limit count is correct",
    result.pagination.limit === limit || result.pagination.limit === 100,
  );

  TestValidator.predicate(
    "records count is non-negative",
    result.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pages count is consistent",
    result.pagination.pages >= 0 &&
      result.pagination.pages >= Math.ceil(result.pagination.records / limit),
  );

  // 8. Validate that all members in the data conform to filter conditions
  for (const memberSummary of result.data) {
    TestValidator.predicate(
      `member email matches filter or is verified`,
      memberSummary.email === memberEmail &&
        memberSummary.is_email_verified === true,
    );
  }
}
