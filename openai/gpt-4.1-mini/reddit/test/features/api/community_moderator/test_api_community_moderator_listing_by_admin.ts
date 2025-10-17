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

/**
 * This E2E test validates the workflow of an admin user listing community
 * moderators with pagination and filtering. The test starts with authenticating
 * as a fresh new admin user, creating a community, and creating member users
 * who will be assigned as moderators for that community. Then, the test assigns
 * moderators to the community. Afterwards, the admin user performs search
 * queries on the community moderators with different pagination and filtering
 * criteria, verifying the correctness of the results, including pagination
 * metadata, presence and correctness of moderator assignment timestamps, and
 * filtering by member ID and community ID. The test also verifies that
 * unauthorized users cannot access the admin listing endpoint. This
 * comprehensive scenario ensures the entire moderator listing and filtering
 * feature enforces business logic and authorization rules correctly.
 *
 * Implementation plan:
 *
 * 1. Admin registration using the provided API to create admin user and get token.
 * 2. Admin login to refresh and switch session.
 * 3. Member user registrations (multiple) using member join API.
 * 4. Each member logs in separately to set session appropriately.
 * 5. Member creates a community.
 * 6. Switch authentication back to admin.
 * 7. Admin assigns some members as moderators to the created community using the
 *    create moderator API.
 * 8. Admin queries moderator list with default pagination.
 * 9. Validate pagination data, moderator entries, and assigned_at timestamps.
 * 10. Perform filtered searches by memberId, communityId, assignedAfter,
 *     assignedBefore.
 * 11. Verify filtering correctness.
 * 12. Attempt to access search API as a non-admin user and assert the error.
 *
 * Use typia.random for random data generation where applicable, ensure
 * compliance with all TypeScript types and API DTO definitions. Use
 * TestValidator for all assertions including equality, predicate checks, and
 * error cases. Call typia.assert on all API responses for runtime validation.
 *
 * Use the exact DTO types: IRedditCommunityAdmin.ICreate and
 * IRedditCommunityAdmin.ILogin for admin auth; IRedditCommunityMember.ICreate
 * and .ILogin for member auth; IRedditCommunityCommunity.ICreate for community
 * creation; IRedditCommunityCommunityModerator.ICreate for moderator
 * assignment; IRedditCommunityCommunityModerators.IRequest for moderator list
 * searches; IPageIRedditCommunityCommunityModerators.ISummary for pagination
 * response.
 *
 * Follow auth role switching properly by calling login endpoints for each
 * actor.
 *
 * Do not create any properties outside of those defined in the DTOs.
 *
 * The function name is test_api_community_moderator_listing_by_admin.
 */
export async function test_api_community_moderator_listing_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "adminpassword123";
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin login to refresh session
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IRedditCommunityAdmin.ILogin,
  });

  // 3. Create member users
  const memberCount = 3;
  const members: IRedditCommunityMember.IAuthorized[] = [];
  const memberEmailList: (string & tags.Format<"email">)[] = [];
  const memberPassword = "memberpassword123";
  for (let i = 0; i < memberCount; i++) {
    const email = typia.random<string & tags.Format<"email">>();
    const member: IRedditCommunityMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: {
          email,
          password: memberPassword,
        } satisfies IRedditCommunityMember.ICreate,
      });
    typia.assert(member);
    members.push(member);
    memberEmailList.push(email);
  }

  // 4. Each member logs in to switch session for their operations if needed (not mandatory to switch here but for clarity)
  for (let i = 0; i < memberCount; i++) {
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberEmailList[i],
        password: memberPassword,
      } satisfies IRedditCommunityMember.ILogin,
    });
  }

  // 5. Create community by first member
  // Switch to first member session
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmailList[0],
      password: memberPassword,
    } satisfies IRedditCommunityMember.ILogin,
  });

  const communityName = RandomGenerator.alphabets(10) + "_comm";
  const communityDescription = RandomGenerator.paragraph({ sentences: 3 });

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: {
          name: communityName,
          description: communityDescription,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 6. Switch back to admin session
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IRedditCommunityAdmin.ILogin,
  });

  // 7. Assign moderators
  // Assign first two members as moderators
  for (let i = 0; i < 2; i++) {
    await api.functional.redditCommunity.admin.communities.communityModerators.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: members[i].id,
          community_id: community.id,
          assigned_at: new Date().toISOString(),
        } satisfies IRedditCommunityCommunityModerator.ICreate,
      },
    );
  }

  // 8. Search moderators - default pagination
  const searchRequest1: IRedditCommunityCommunityModerators.IRequest = {
    page: 1,
    limit: 10,
  };
  const page1: IPageIRedditCommunityCommunityModerators.ISummary =
    await api.functional.redditCommunity.admin.redditCommunityCommunityModerators.search(
      connection,
      { body: searchRequest1 },
    );
  typia.assert(page1);

  TestValidator.predicate(
    "pagination current page > 0",
    page1.pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit > 0", page1.pagination.limit > 0);
  TestValidator.predicate(
    "page data length <= limit",
    page1.data.length <= page1.pagination.limit,
  );

  // Validate that moderator assignments include assigned_at s
  for (const moderator of page1.data) {
    TestValidator.predicate(
      "assigned_at is valid ISO date",
      typeof moderator.assigned_at === "string" &&
        !isNaN(Date.parse(moderator.assigned_at)),
    );
  }

  // 9. Search with filtering by memberId for first member
  const searchRequest2: IRedditCommunityCommunityModerators.IRequest = {
    page: 1,
    limit: 10,
    memberId: members[0].id,
  };
  const filteredByMember: IPageIRedditCommunityCommunityModerators.ISummary =
    await api.functional.redditCommunity.admin.redditCommunityCommunityModerators.search(
      connection,
      { body: searchRequest2 },
    );
  typia.assert(filteredByMember);

  // All returned moderators must have member_id === members[0].id
  for (const moderator of filteredByMember.data) {
    TestValidator.equals(
      "filtered member_id matches",
      moderator.member_id,
      members[0].id,
    );
  }

  // 10. Search with filtering by communityId
  const searchRequest3: IRedditCommunityCommunityModerators.IRequest = {
    page: 1,
    limit: 10,
    communityId: community.id,
  };

  const filteredByCommunity: IPageIRedditCommunityCommunityModerators.ISummary =
    await api.functional.redditCommunity.admin.redditCommunityCommunityModerators.search(
      connection,
      { body: searchRequest3 },
    );
  typia.assert(filteredByCommunity);

  for (const moderator of filteredByCommunity.data) {
    TestValidator.equals(
      "filtered community_id matches",
      moderator.community_id,
      community.id,
    );
  }

  // 11. Filtering by assignedAfter and assignedBefore
  // assignedAfter: now minus 1 day, assignedBefore: now plus 1 day
  const now = new Date();
  const assignedAfter = new Date(
    now.getTime() - 24 * 60 * 60 * 1000,
  ).toISOString();
  const assignedBefore = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();

  const searchRequest4: IRedditCommunityCommunityModerators.IRequest = {
    page: 1,
    limit: 10,
    assignedAfter,
    assignedBefore,
  };

  const filteredByAssignedDate: IPageIRedditCommunityCommunityModerators.ISummary =
    await api.functional.redditCommunity.admin.redditCommunityCommunityModerators.search(
      connection,
      { body: searchRequest4 },
    );
  typia.assert(filteredByAssignedDate);

  for (const moderator of filteredByAssignedDate.data) {
    // Check assigned_at is within range
    TestValidator.predicate(
      "assigned_at after assignedAfter",
      moderator.assigned_at >= assignedAfter,
    );
    TestValidator.predicate(
      "assigned_at before assignedBefore",
      moderator.assigned_at <= assignedBefore,
    );
  }

  // 12. Attempt unauthorized access with member user
  // Switch to member user login 1
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmailList[0],
      password: memberPassword,
    } satisfies IRedditCommunityMember.ILogin,
  });

  await TestValidator.error(
    "Unauthorized user should not access moderator search",
    async () => {
      await api.functional.redditCommunity.admin.redditCommunityCommunityModerators.search(
        connection,
        { body: searchRequest1 },
      );
    },
  );
}
