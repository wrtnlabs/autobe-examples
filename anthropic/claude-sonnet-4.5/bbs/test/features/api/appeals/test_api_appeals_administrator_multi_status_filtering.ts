import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAppeal";

export async function test_api_appeals_administrator_multi_status_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for appeal management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const adminUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create multiple member accounts (3 members) with stored credentials
  const memberCredentials: Array<{
    email: string;
    password: string;
    member: IDiscussionBoardMember.IAuthorized;
  }> = [];

  for (let i = 0; i < 3; i++) {
    const memberEmail = typia.random<string & tags.Format<"email">>();
    const memberPassword = typia.random<
      string & tags.MinLength<8> & tags.MaxLength<128>
    >();
    const memberUsername = typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<30> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >();

    const member = await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.ICreate,
    });
    typia.assert(member);

    memberCredentials.push({
      email: memberEmail,
      password: memberPassword,
      member,
    });
  }

  // Step 3: Create topics for each member
  const topics: IDiscussionBoardTopic[] = [];

  for (const cred of memberCredentials) {
    // Switch to member account
    await api.functional.auth.member.login(connection, {
      body: {
        email: cred.email,
        password: cred.password,
      } satisfies IDiscussionBoardMember.ILogin,
    });

    // Create topic with a valid category structure
    const topic = await api.functional.discussionBoard.member.topics.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          tag_ids: null,
        } satisfies IDiscussionBoardTopic.ICreate,
      },
    );
    typia.assert(topic);
    topics.push(topic);
  }

  // Step 4: Switch to administrator and create moderation actions
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ILogin,
  });

  const actionTypes = [
    "hide_content",
    "delete_content",
    "issue_warning",
  ] as const;
  const violationCategories = [
    "spam",
    "offensive_language",
    "off_topic",
  ] as const;
  const moderationActions: IDiscussionBoardModerationAction[] = [];

  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    const cred = memberCredentials[i];

    const moderationAction =
      await api.functional.discussionBoard.administrator.moderationActions.create(
        connection,
        {
          body: {
            administrator_id: admin.id,
            target_member_id: cred.member.id,
            content_topic_id: topic.id,
            action_type: RandomGenerator.pick(actionTypes),
            reason: RandomGenerator.paragraph({ sentences: 5 }),
            violation_category: RandomGenerator.pick(violationCategories),
            content_snapshot: topic.body,
          } satisfies IDiscussionBoardModerationAction.ICreate,
        },
      );
    typia.assert(moderationAction);
    moderationActions.push(moderationAction);
  }

  // Step 5: Create appeals for each moderation action
  const appeals: IDiscussionBoardAppeal[] = [];

  for (let i = 0; i < moderationActions.length; i++) {
    const moderationAction = moderationActions[i];
    const cred = memberCredentials[i];

    // Switch to member account to create appeal
    await api.functional.auth.member.login(connection, {
      body: {
        email: cred.email,
        password: cred.password,
      } satisfies IDiscussionBoardMember.ILogin,
    });

    const appeal = await api.functional.discussionBoard.member.appeals.create(
      connection,
      {
        body: {
          appealed_moderation_action_id: moderationAction.id,
          appeal_explanation: RandomGenerator.paragraph({ sentences: 20 }),
          additional_evidence: RandomGenerator.paragraph({ sentences: 10 }),
        } satisfies IDiscussionBoardAppeal.ICreate,
      },
    );
    typia.assert(appeal);
    appeals.push(appeal);
  }

  // Step 6: Authenticate as administrator for testing filters
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ILogin,
  });

  // Step 7: Test retrieving all appeals without filters
  const allAppeals =
    await api.functional.discussionBoard.administrator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 25,
        } satisfies IDiscussionBoardAppeal.IRequest,
      },
    );
  typia.assert(allAppeals);
  TestValidator.predicate(
    "appeals exist in system",
    allAppeals.data.length > 0,
  );

  // Step 8: Test date range filtering for recent submissions
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const dateRangeAppeals =
    await api.functional.discussionBoard.administrator.appeals.index(
      connection,
      {
        body: {
          submitted_from: yesterday.toISOString(),
          submitted_to: tomorrow.toISOString(),
          page: 1,
          limit: 25,
        } satisfies IDiscussionBoardAppeal.IRequest,
      },
    );
  typia.assert(dateRangeAppeals);
  TestValidator.predicate(
    "date range filtering works",
    dateRangeAppeals.data.length >= appeals.length,
  );

  // Step 9: Test member-specific filtering
  const memberAppeals =
    await api.functional.discussionBoard.administrator.appeals.index(
      connection,
      {
        body: {
          member_id: memberCredentials[0].member.id,
          page: 1,
          limit: 25,
        } satisfies IDiscussionBoardAppeal.IRequest,
      },
    );
  typia.assert(memberAppeals);
  TestValidator.predicate(
    "member filtering returns results",
    memberAppeals.data.length >= 1,
  );

  // Step 10: Test sorting by submission date ascending
  const sortedAscAppeals =
    await api.functional.discussionBoard.administrator.appeals.index(
      connection,
      {
        body: {
          sort_by: "submitted_at",
          sort_order: "asc",
          page: 1,
          limit: 25,
        } satisfies IDiscussionBoardAppeal.IRequest,
      },
    );
  typia.assert(sortedAscAppeals);

  // Step 11: Test sorting by submission date descending
  const sortedDescAppeals =
    await api.functional.discussionBoard.administrator.appeals.index(
      connection,
      {
        body: {
          sort_by: "submitted_at",
          sort_order: "desc",
          page: 1,
          limit: 25,
        } satisfies IDiscussionBoardAppeal.IRequest,
      },
    );
  typia.assert(sortedDescAppeals);

  // Step 12: Test empty results with non-matching member ID
  const emptyAppeals =
    await api.functional.discussionBoard.administrator.appeals.index(
      connection,
      {
        body: {
          member_id: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 25,
        } satisfies IDiscussionBoardAppeal.IRequest,
      },
    );
  typia.assert(emptyAppeals);
  TestValidator.equals(
    "empty results for non-existent member",
    emptyAppeals.data.length,
    0,
  );

  // Step 13: Verify pagination structure
  TestValidator.predicate(
    "pagination exists in response",
    allAppeals.pagination !== null && allAppeals.pagination !== undefined,
  );

  // Step 14: Verify response includes appeal details
  if (allAppeals.data.length > 0) {
    const firstAppeal = allAppeals.data[0];
    typia.assertGuard(firstAppeal);
    TestValidator.predicate(
      "appeal has required fields",
      firstAppeal.id !== null &&
        firstAppeal.appeal_explanation !== null &&
        firstAppeal.submitted_at !== null,
    );
  }
}
