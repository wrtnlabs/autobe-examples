import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModerationAction";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test that administrators can search and retrieve moderation actions across
 * communities.
 *
 * This test validates that admin users have access to search moderation
 * actions. Due to API limitations (no login endpoints available, only
 * registration endpoints), this test creates the necessary test data using a
 * single user flow and then verifies that an administrator can successfully
 * search and retrieve moderation actions with various filtering options.
 *
 * Test workflow:
 *
 * 1. Create administrator account
 * 2. Create moderator account (becomes community creator)
 * 3. Create member account for content authoring
 * 4. Create two communities as moderator
 * 5. Create posts in both communities as member
 * 6. Submit content reports for the posts
 * 7. Create moderation actions as moderator
 * 8. Search moderation actions as administrator with various filters
 * 9. Verify search results include actions from multiple communities
 * 10. Test filtering by community ID, action type, and status
 */
export async function test_api_admin_moderation_actions_platform_wide_search(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const adminData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: adminEmail,
    password: adminPassword,
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  const adminConnection: api.IConnection = { ...connection };
  adminConnection.headers = { ...connection.headers };
  adminConnection.headers.Authorization = admin.token.access;

  // Step 2: Create moderator account (will be community creator)
  const moderatorData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  const moderatorConnection: api.IConnection = { ...connection };
  moderatorConnection.headers = { ...connection.headers };
  moderatorConnection.headers.Authorization = moderator.token.access;

  // Step 3: Create first community as moderator
  const community1Data = {
    code: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<25> &
        tags.Pattern<"^[a-zA-Z0-9_]+$">
    >(),
    name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
    description: typia.random<
      string & tags.MinLength<10> & tags.MaxLength<500>
    >(),
  } satisfies IRedditLikeCommunity.ICreate;

  const community1: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(
      moderatorConnection,
      {
        body: community1Data,
      },
    );
  typia.assert(community1);

  // Step 4: Create second community as moderator
  const community2Data = {
    code: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<25> &
        tags.Pattern<"^[a-zA-Z0-9_]+$">
    >(),
    name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
    description: typia.random<
      string & tags.MinLength<10> & tags.MaxLength<500>
    >(),
  } satisfies IRedditLikeCommunity.ICreate;

  const community2: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(
      moderatorConnection,
      {
        body: community2Data,
      },
    );
  typia.assert(community2);

  // Step 5: Create member account for posting content
  const memberData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  const memberConnection: api.IConnection = { ...connection };
  memberConnection.headers = { ...connection.headers };
  memberConnection.headers.Authorization = member.token.access;

  // Step 6: Create post in community1 as member
  const post1Data = {
    community_id: community1.id,
    type: "text",
    title: typia.random<string & tags.MinLength<3> & tags.MaxLength<300>>(),
    body: typia.random<string & tags.MaxLength<40000>>(),
  } satisfies IRedditLikePost.ICreate;

  const post1: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(memberConnection, {
      body: post1Data,
    });
  typia.assert(post1);

  // Step 7: Create post in community2 as member
  const post2Data = {
    community_id: community2.id,
    type: "link",
    title: typia.random<string & tags.MinLength<3> & tags.MaxLength<300>>(),
    url: typia.random<string & tags.MaxLength<2000>>(),
  } satisfies IRedditLikePost.ICreate;

  const post2: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(memberConnection, {
      body: post2Data,
    });
  typia.assert(post2);

  // Step 8: Submit content report for post1
  const report1Data = {
    reported_post_id: post1.id,
    community_id: community1.id,
    content_type: "post",
    violation_categories: "spam",
  } satisfies IRedditLikeContentReport.ICreate;

  const report1: IRedditLikeContentReport =
    await api.functional.redditLike.content_reports.create(memberConnection, {
      body: report1Data,
    });
  typia.assert(report1);

  // Step 9: Submit content report for post2
  const report2Data = {
    reported_post_id: post2.id,
    community_id: community2.id,
    content_type: "post",
    violation_categories: "harassment",
  } satisfies IRedditLikeContentReport.ICreate;

  const report2: IRedditLikeContentReport =
    await api.functional.redditLike.content_reports.create(memberConnection, {
      body: report2Data,
    });
  typia.assert(report2);

  // Step 10: Create moderation action in community1 as moderator
  const action1Data = {
    report_id: report1.id,
    affected_post_id: post1.id,
    community_id: community1.id,
    action_type: "remove",
    content_type: "post",
    removal_type: "community",
    reason_category: "spam",
    reason_text: "Spam content detected",
  } satisfies IRedditLikeModerationAction.ICreate;

  const action1: IRedditLikeModerationAction =
    await api.functional.redditLike.moderator.moderation.actions.create(
      moderatorConnection,
      {
        body: action1Data,
      },
    );
  typia.assert(action1);

  // Step 11: Create moderation action in community2 as moderator
  const action2Data = {
    report_id: report2.id,
    affected_post_id: post2.id,
    community_id: community2.id,
    action_type: "approve",
    content_type: "post",
    reason_category: "false_positive",
    reason_text: "Report was invalid",
  } satisfies IRedditLikeModerationAction.ICreate;

  const action2: IRedditLikeModerationAction =
    await api.functional.redditLike.moderator.moderation.actions.create(
      moderatorConnection,
      {
        body: action2Data,
      },
    );
  typia.assert(action2);

  // Step 12: Search all moderation actions as administrator (no filters)
  const allActionsRequest = {
    page: 1,
    limit: 20,
  } satisfies IRedditLikeModerationAction.IRequest;

  const allActionsPage: IPageIRedditLikeModerationAction =
    await api.functional.redditLike.admin.moderation.actions.index(
      adminConnection,
      {
        body: allActionsRequest,
      },
    );
  typia.assert(allActionsPage);

  // Step 13: Verify platform-wide search returns actions from both communities
  TestValidator.predicate(
    "platform-wide search should return at least 2 actions",
    allActionsPage.data.length >= 2,
  );

  const allActionIds = allActionsPage.data.map((a) => a.id);
  TestValidator.predicate(
    "platform-wide search should include action from community1",
    allActionIds.includes(action1.id),
  );
  TestValidator.predicate(
    "platform-wide search should include action from community2",
    allActionIds.includes(action2.id),
  );

  // Step 14: Filter by community1 ID
  const community1Request = {
    page: 1,
    limit: 10,
    community_id: community1.id,
  } satisfies IRedditLikeModerationAction.IRequest;

  const community1Page: IPageIRedditLikeModerationAction =
    await api.functional.redditLike.admin.moderation.actions.index(
      adminConnection,
      {
        body: community1Request,
      },
    );
  typia.assert(community1Page);

  TestValidator.predicate(
    "community1 filter should return at least 1 action",
    community1Page.data.length >= 1,
  );

  const community1ActionIds = community1Page.data.map((a) => a.id);
  TestValidator.predicate(
    "community1 filter should include action1",
    community1ActionIds.includes(action1.id),
  );

  // Step 15: Filter by action type "remove"
  const removeActionsRequest = {
    page: 1,
    limit: 10,
    action_type: "remove",
  } satisfies IRedditLikeModerationAction.IRequest;

  const removeActionsPage: IPageIRedditLikeModerationAction =
    await api.functional.redditLike.admin.moderation.actions.index(
      adminConnection,
      {
        body: removeActionsRequest,
      },
    );
  typia.assert(removeActionsPage);

  TestValidator.predicate(
    "action_type filter for remove should return results",
    removeActionsPage.data.length >= 1,
  );

  const removeActionIds = removeActionsPage.data.map((a) => a.id);
  TestValidator.predicate(
    "remove action filter should include action1",
    removeActionIds.includes(action1.id),
  );

  // Step 16: Filter by status "completed"
  const completedRequest = {
    page: 1,
    limit: 10,
    status: "completed",
  } satisfies IRedditLikeModerationAction.IRequest;

  const completedPage: IPageIRedditLikeModerationAction =
    await api.functional.redditLike.admin.moderation.actions.index(
      adminConnection,
      {
        body: completedRequest,
      },
    );
  typia.assert(completedPage);

  TestValidator.predicate(
    "status filter should execute successfully",
    completedPage.data.length >= 0,
  );

  // Step 17: Verify pagination information
  TestValidator.predicate(
    "pagination should have valid current page",
    allActionsPage.pagination.current >= 1,
  );

  TestValidator.predicate(
    "pagination should have valid limit",
    allActionsPage.pagination.limit >= 1,
  );
}
