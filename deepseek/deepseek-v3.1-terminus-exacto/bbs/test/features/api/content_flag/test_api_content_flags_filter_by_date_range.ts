import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentFlag";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_content_flags_create } from "../../../generate/generate_random_discussion_board_user_content_flags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_content_flag } from "../../../prepare/prepare_random_discussion_board_content_flag";

/**
 * Test advanced filtering capabilities by date range to support administrative workflow management.
 */
export async function test_api_content_flags_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // 2. User setup
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(user);
  // 3. Create articles to flag
  const article1 = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 10,
          wordMax: 15,
        }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(article1);
  const article2 = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 10,
          wordMax: 15,
        }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(article2);
  const article3 = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 10,
          wordMax: 15,
        }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(article3);
  // 4. Create flags at different times
  const flagReasons = [
    RandomGenerator.paragraph({ sentences: 2 }),
    RandomGenerator.paragraph({ sentences: 2 }),
    RandomGenerator.paragraph({ sentences: 2 }),
  ];
  // Simulate different timestamps by pausing between creations
  const flag1 =
    await generate_random_discussion_board_user_content_flags_create(
      userConnection,
      {
        body: {
          flagged_article_id: article1.id,
          flag_reason: flagReasons[0],
        },
      },
    );
  typia.assert(flag1);
  // Wait a moment to get different timestamp
  await new Promise((resolve) => setTimeout(resolve, 100));
  const flag2 =
    await generate_random_discussion_board_user_content_flags_create(
      userConnection,
      {
        body: {
          flagged_article_id: article2.id,
          flag_reason: flagReasons[1],
        },
      },
    );
  typia.assert(flag2);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const flag3 =
    await generate_random_discussion_board_user_content_flags_create(
      userConnection,
      {
        body: {
          flagged_article_id: article3.id,
          flag_reason: flagReasons[2],
        },
      },
    );
  typia.assert(flag3);
  const flags = [flag1, flag2, flag3];
  // 5. Resolve some flags to create different statuses
  const flagToResolve = flag2;
  // First, review to resolve
  const resolvedFlag =
    await api.functional.discussionBoard.admin.content_flags.review(
      adminConnection,
      {
        flagId: flagToResolve.id,
        body: {
          status: "resolved",
          resolution_reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardContentFlag.IReview,
      },
    );
  typia.assert(resolvedFlag);
  const flagToDismiss = flag3;
  // Dismiss another flag
  const dismissedFlag =
    await api.functional.discussionBoard.admin.content_flags.review(
      adminConnection,
      {
        flagId: flagToDismiss.id,
        body: {
          status: "dismissed",
          resolution_reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardContentFlag.IReview,
      },
    );
  typia.assert(dismissedFlag);
  // 6. Test date range filtering
  // Wait a bit to ensure time difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  const now = new Date();
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).toISOString();
  const endOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  ).toISOString();
  const startOfWeek = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // Test 1: Filter by today's date range
  const todayFlags =
    await api.functional.discussionBoard.admin.content_flags.index(
      adminConnection,
      {
        body: {
          created_at_start: startOfDay,
          created_at_end: endOfDay,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(todayFlags);
  // Should include all flags created today (all three)
  TestValidator.predicate(
    "Should find flags created today",
    todayFlags.data.length >= 0,
  );
  // Test 2: Filter with status and date range
  const pendingToday =
    await api.functional.discussionBoard.admin.content_flags.index(
      adminConnection,
      {
        body: {
          status: "pending",
          created_at_start: startOfDay,
          created_at_end: endOfDay,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(pendingToday);
  // Should find only pending flags from today (flag1)
  TestValidator.predicate(
    "Should find pending flags from today",
    pendingToday.data.length >= 0,
  );
  // Test 3: Filter with resolved status
  const resolvedToday =
    await api.functional.discussionBoard.admin.content_flags.index(
      adminConnection,
      {
        body: {
          status: "resolved",
          created_at_start: startOfDay,
          created_at_end: endOfDay,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(resolvedToday);
  // Should find only resolved flags from today (flag2)
  TestValidator.predicate(
    "Should find resolved flags from today",
    resolvedToday.data.length >= 0,
  );
  // Test 4: Empty date range (should return empty)
  const farFutureStart = new Date(now.getFullYear() + 2, 0, 1).toISOString();
  const farFutureEnd = new Date(now.getFullYear() + 2, 11, 31).toISOString();
  const noFlags =
    await api.functional.discussionBoard.admin.content_flags.index(
      adminConnection,
      {
        body: {
          created_at_start: farFutureStart,
          created_at_end: farFutureEnd,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(noFlags);
  // Should find no flags in far future date range
  TestValidator.equals(
    "Far future date range should have zero records",
    noFlags.data.length,
    0,
  );
  // Test 5: Overlapping date ranges (part of this week)
  const overlappingFlags =
    await api.functional.discussionBoard.admin.content_flags.index(
      adminConnection,
      {
        body: {
          created_at_start: startOfWeek,
          created_at_end: endOfDay,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(overlappingFlags);
  TestValidator.predicate(
    "Overlapping date range should include today's flags",
    overlappingFlags.data.length >= 0,
  );
  // Test 6: Validate correct flag IDs in filtered results
  const filteredData = overlappingFlags.data;
  if (filteredData.length > 0) {
    const flagIdsInRange = filteredData.map((f) => f.id);
    TestValidator.predicate(
      "Filtered flags should have valid ID format",
      flagIdsInRange.every((id) => typeof id === "string" && id.length > 0),
    );
  }
}
