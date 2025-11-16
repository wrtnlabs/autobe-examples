import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserLogin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardReportStatisticsByTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportStatisticsByTarget";
import type { IDiscussionBoardReportStatisticsByTargetBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportStatisticsByTargetBucket";

export async function test_api_report_statistics_by_target_filter_by_status_and_action(
  connection: api.IConnection,
) {
  // A. Create admin user (join)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // B. Create member user (join)
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    displayName: RandomGenerator.name(),
    bio: null,
    location: null,
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // C. Switch to admin and create an article category
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoggedIn: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  const categoryCreateBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: 1 as number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);

  // D. Switch to member, create an article under that category
  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/landing",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberLoggedIn: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoggedIn);

  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleCreateBody },
    );
  typia.assert(article);

  TestValidator.equals(
    "article category id should match created category",
    article.category.id,
    category.id,
  );

  // E. Create multiple reports for that article as member
  const reportCount = 4;
  const reports: IDiscussionBoardReport[] = [];

  for (let i = 0; i < reportCount; i++) {
    const reportCreateBody = {
      category: RandomGenerator.pick([
        "spam",
        "hate_abuse",
        "off_topic",
        "dangerous_misleading",
      ] as const),
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      target_article_id: article.id,
    } satisfies IDiscussionBoardReport.ICreate;

    const report: IDiscussionBoardReport =
      await api.functional.discussionBoard.memberUser.reports.create(
        connection,
        { body: reportCreateBody },
      );
    typia.assert(report);
    reports.push(report);
  }

  TestValidator.predicate(
    "should have created at least one report for the article",
    reports.length > 0,
  );

  const baseTargetType: string = reports[0].target_type;

  // F. Switch back to admin to call statistics endpoint
  const adminReLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login2",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminRelogged: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminReLoginBody,
    });
  typia.assert(adminRelogged);

  // Helper to call statistics and get bucket for our targetType
  const getBucket = async (
    body: IDiscussionBoardReportStatisticsByTarget.IRequest,
  ): Promise<{
    stats: IDiscussionBoardReportStatisticsByTarget;
    bucket: IDiscussionBoardReportStatisticsByTargetBucket | undefined;
  }> => {
    const stats: IDiscussionBoardReportStatisticsByTarget =
      await api.functional.discussionBoard.adminUser.reports.statistics.byTarget.index(
        connection,
        { body },
      );
    typia.assert(stats);
    const bucket = stats.buckets.find((b) => b.targetType === baseTargetType);
    return { stats, bucket };
  };

  // 1) Baseline: no filters
  const { bucket: baseBucket } = await getBucket({});

  if (baseBucket) {
    TestValidator.predicate(
      "baseline totalReportCount should be non-negative",
      baseBucket.totalReportCount >= 0,
    );
    TestValidator.predicate(
      "baseline openReportCount should be non-negative",
      baseBucket.openReportCount >= 0,
    );
    TestValidator.predicate(
      "baseline resolvedReportCount should be non-negative",
      baseBucket.resolvedReportCount >= 0,
    );
  }

  const baseTotal = baseBucket?.totalReportCount ?? 0;

  TestValidator.predicate(
    "baseline totalReportCount should be at least number of created reports",
    baseTotal >= reports.length,
  );

  // 2) Filter by actual status from first report
  const statusValue = reports[0].status;
  const { bucket: statusBucket } = await getBucket({
    statusList: [statusValue],
  });

  if (baseBucket && statusBucket) {
    TestValidator.predicate(
      "status-filtered totalReportCount must not exceed baseline",
      statusBucket.totalReportCount <= baseBucket.totalReportCount,
    );
  }

  // 3) Filter by actual action from first report
  const actionValue = reports[0].action;
  const { bucket: actionBucket } = await getBucket({
    actionList: [actionValue],
  });

  if (baseBucket && actionBucket) {
    TestValidator.predicate(
      "action-filtered totalReportCount must not exceed baseline",
      actionBucket.totalReportCount <= baseBucket.totalReportCount,
    );
  }

  // 4) Combined filter (status + action)
  const { bucket: combinedBucket } = await getBucket({
    statusList: [statusValue],
    actionList: [actionValue],
  });

  if (combinedBucket && statusBucket && actionBucket) {
    TestValidator.predicate(
      "combined filtered totalReportCount must not exceed status-only count",
      combinedBucket.totalReportCount <= statusBucket.totalReportCount,
    );
    TestValidator.predicate(
      "combined filtered totalReportCount must not exceed action-only count",
      combinedBucket.totalReportCount <= actionBucket.totalReportCount,
    );
  }

  // 5) Filter with non-matching status and action to see that counts do not increase
  const { bucket: weirdStatusBucket } = await getBucket({
    statusList: ["__non_existing_status__"],
  });
  if (baseBucket && weirdStatusBucket) {
    TestValidator.predicate(
      "weird status filter should not increase totalReportCount",
      weirdStatusBucket.totalReportCount <= baseBucket.totalReportCount,
    );
  }

  const { bucket: weirdActionBucket } = await getBucket({
    actionList: ["__non_existing_action__"],
  });
  if (baseBucket && weirdActionBucket) {
    TestValidator.predicate(
      "weird action filter should not increase totalReportCount",
      weirdActionBucket.totalReportCount <= baseBucket.totalReportCount,
    );
  }
}
