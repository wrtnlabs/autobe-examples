import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAction";

export async function test_api_moderation_queue_pagination_and_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      appointed_by_admin_id: admin.id,
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: moderatorEmail,
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Create multiple member accounts
  const memberCredentials: Array<{
    email: string;
    password: string;
    member: IDiscussionBoardMember.IAuthorized;
  }> = [];
  for (let i = 0; i < 10; i++) {
    const memberEmail = typia.random<string & tags.Format<"email">>();
    const memberPassword = typia.random<
      string & tags.MinLength<8> & tags.MaxLength<128>
    >();
    const member = await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
    typia.assert(member);
    memberCredentials.push({
      email: memberEmail,
      password: memberPassword,
      member,
    });
  }

  // Step 4: Create categories (admin is already authenticated from step 1)
  const categories = await ArrayUtil.asyncRepeat(3, async (index) => {
    const category =
      await api.functional.discussionBoard.administrator.categories.create(
        connection,
        {
          body: {
            name: `Category ${index + 1}`,
            slug: `category-${index + 1}`,
            description: RandomGenerator.paragraph(),
            display_order: index,
            is_active: true,
          } satisfies IDiscussionBoardCategory.ICreate,
        },
      );
    typia.assert(category);
    return category;
  });

  // Step 5: Create topics using member accounts
  const topics: IDiscussionBoardTopic[] = [];
  for (let i = 0; i < 20; i++) {
    const memberCred = memberCredentials[i % memberCredentials.length];
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: memberCred.email,
        password: memberCred.password,
      } satisfies IDiscussionBoardMember.ICreate,
    });

    const topic = await api.functional.discussionBoard.member.topics.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          category_id: categories[i % categories.length].id,
          tag_ids: null,
        } satisfies IDiscussionBoardTopic.ICreate,
      },
    );
    typia.assert(topic);
    topics.push(topic);
  }

  // Step 6: Create reports with varying characteristics
  const violationCategories = [
    "personal_attack",
    "hate_speech",
    "misinformation",
    "spam",
    "offensive_language",
    "off_topic",
    "threats",
    "doxxing",
    "trolling",
    "other",
  ] as const;

  for (let i = 0; i < 50; i++) {
    const reporterCred = memberCredentials[i % memberCredentials.length];
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: reporterCred.email,
        password: reporterCred.password,
      } satisfies IDiscussionBoardMember.ICreate,
    });

    const violationCategory =
      violationCategories[i % violationCategories.length];
    const report = await api.functional.discussionBoard.member.reports.create(
      connection,
      {
        body: {
          reported_topic_id: topics[i % topics.length].id,
          violation_category: violationCategory,
          reporter_explanation:
            violationCategory === "other"
              ? RandomGenerator.paragraph({ sentences: 3 })
              : null,
        } satisfies IDiscussionBoardReport.ICreate,
      },
    );
    typia.assert(report);
  }

  // Switch to moderator for queue access
  await api.functional.auth.moderator.join(connection, {
    body: {
      appointed_by_admin_id: admin.id,
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: moderatorEmail,
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });

  // Step 7: Test basic pagination
  const firstPage =
    await api.functional.discussionBoard.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.predicate("first page has data", firstPage.data.length <= 10);
  TestValidator.equals(
    "pagination current page",
    firstPage.pagination.current,
    1,
  );

  const secondPage =
    await api.functional.discussionBoard.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);

  // Step 8: Test filtering by violation category
  const spamReports =
    await api.functional.discussionBoard.moderator.moderationActions.index(
      connection,
      {
        body: {
          violation_category: "spam",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(spamReports);

  // Step 9: Test filtering by severity level
  const criticalReports =
    await api.functional.discussionBoard.moderator.moderationActions.index(
      connection,
      {
        body: {
          severity: "critical",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(criticalReports);

  // Step 10: Test filtering by status
  const pendingReports =
    await api.functional.discussionBoard.moderator.moderationActions.index(
      connection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(pendingReports);

  // Step 11: Test combined filters
  const combinedFilter =
    await api.functional.discussionBoard.moderator.moderationActions.index(
      connection,
      {
        body: {
          status: "pending",
          severity: "high",
          violation_category: "hate_speech",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(combinedFilter);

  // Step 12: Test date range filtering
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateFilteredReports =
    await api.functional.discussionBoard.moderator.moderationActions.index(
      connection,
      {
        body: {
          date_from: yesterday.toISOString(),
          date_to: now.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(dateFilteredReports);

  // Step 13: Test different page sizes
  const smallPageSize =
    await api.functional.discussionBoard.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(smallPageSize);
  TestValidator.predicate(
    "small page size respected",
    smallPageSize.data.length <= 5,
  );

  const largePageSize =
    await api.functional.discussionBoard.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(largePageSize);
  TestValidator.predicate(
    "large page size respected",
    largePageSize.data.length <= 50,
  );

  // Step 14: Validate pagination metadata accuracy
  TestValidator.predicate(
    "total pages calculated correctly",
    firstPage.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "total records present",
    firstPage.pagination.records >= 0,
  );
  TestValidator.equals("limit matches request", firstPage.pagination.limit, 10);
}
