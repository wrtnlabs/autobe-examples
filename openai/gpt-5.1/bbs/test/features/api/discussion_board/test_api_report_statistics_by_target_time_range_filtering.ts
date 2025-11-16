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

/**
 * Verify that admin report statistics by target_type properly react to
 * createdAtFrom/createdAtTo filters, by comparing filtered vs unfiltered
 * aggregation for article-targeted reports.
 *
 * Business context
 *
 * - Only adminUser actors can access the statistics endpoint PATCH
 *   /discussionBoard/adminUser/reports/statistics/byTarget.
 * - Reports are filed by memberUser actors via POST
 *   /discussionBoard/memberUser/reports, targeting articles created under
 *   categories defined by adminUser.
 * - The statistics endpoint aggregates counts per target_type (e.g. "article")
 *   over rows in discussion_board_reports after applying the filters in
 *   IDiscussionBoardReportStatisticsByTarget.IRequest (createdAtFrom/To,
 *   statusList, actionList, reasonCodeList).
 *
 * Scenario steps
 *
 * 1. Bootstrap actors
 *
 *    - Register an adminUser via POST /auth/adminUser/join using
 *         IDiscussionBoardAdminUserJoin.IRequest and keep its email/password.
 *         Ensure typia.assert on the returned
 *         IDiscussionBoardAdminuser.IAuthorized.
 *    - Register a memberUser via POST /auth/memberUser/join using
 *         IDiscussionBoardMemberUserJoin.IRequest and typia.assert the
 *         IDiscussionBoardMemberuser.IAuthorized result.
 * 2. Create article category as adminUser
 *
 *    - Using the adminUser token already set on the connection by join, call POST
 *         /discussionBoard/adminUser/articleCategories with a body satisfying
 *         IDiscussionBoardArticleCategory.ICreate to create a single category.
 *         typia.assert the returned IDiscussionBoardArticleCategory.
 * 3. Create article as memberUser
 *
 *    - Switch authentication to memberUser by calling POST /auth/memberUser/login
 *         with the stored member email/password and typia.assert the
 *         IDiscussionBoardMemberuser.IAuthorized response.
 *    - Call POST /discussionBoard/memberUser/articles with a body satisfying
 *         IDiscussionBoardArticle.ICreate, referencing the created category id
 *         in categoryId. typia.assert the resulting IDiscussionBoardArticle.
 * 4. Create two logical batches of reports against the same article
 *
 *    - Still as memberUser, create an "old" batch of reports:
 *
 *         - Call POST /discussionBoard/memberUser/reports several times (e.g. 2 or 3)
 *                   with bodies satisfying IDiscussionBoardReport.ICreate using
 *                   target_article_id set to the article id, no
 *                   comment/attachment targets, and simple category/reason
 *                   strings.
 *         - Typia.assert each IDiscussionBoardReport response and store them in an array
 *                   so we can count how many reports we created overall.
 *    - Capture a mid-point timestamp string midTimestamp = new Date().toISOString()
 *         after finishing the old batch to conceptually mark a boundary between
 *         old and new reports.
 *    - Create a "new" batch of reports against the same article (again 2 or 3 calls
 *         to POST /discussionBoard/memberUser/reports with the same pattern of
 *         IDiscussionBoardReport.ICreate request bodies). typia.assert each
 *         response and record them.
 * 5. Query unfiltered statistics as adminUser
 *
 *    - Switch back to adminUser using POST /auth/adminUser/login with the stored
 *         admin credentials; typia.assert the result.
 *    - Call PATCH /discussionBoard/adminUser/reports/statistics/byTarget.index with
 *         an empty filter body ({} satisfies
 *         IDiscussionBoardReportStatisticsByTarget.IRequest).
 *    - Typia.assert the IDiscussionBoardReportStatisticsByTarget response.
 *    - From the buckets array, find the bucket whose targetType is "article", if it
 *         exists.
 * 6. Query statistics with a createdAtFrom filter approximating the new batch
 *
 *    - Immediately call the statistics endpoint again with a body satisfying
 *         IDiscussionBoardReportStatisticsByTarget.IRequest where createdAtFrom
 *         is set to midTimestamp and other filters are omitted.
 *    - Typia.assert the filtered statistics.
 *    - Again, locate the "article" bucket if present.
 * 7. Assertions comparing filtered vs unfiltered counts
 *
 *    - If there is no "article" bucket in the unfiltered result, simply assert that
 *         no "article" bucket exists in the filtered result as well.
 *    - If "article" buckets exist in both results, assert that:
 *
 *         - TotalReportCount in the filtered bucket is less than or equal to
 *                   totalReportCount in the unfiltered bucket using
 *                   TestValidator.predicate with a descriptive title.
 *         - OpenReportCount and resolvedReportCount in the filtered bucket are each less
 *                   than or equal to their counterparts in the unfiltered
 *                   bucket.
 *         - The sum openReportCount + resolvedReportCount equals totalReportCount in both
 *                   unfiltered and filtered buckets using
 *                   TestValidator.equals.
 *    - Optionally, also assert that the unfiltered totalReportCount is greater than
 *         zero to confirm the scenario produced at least one report.
 * 8. Edge behavior for time window
 *
 *    - Because the server decides the created_at timestamps and we approximate the
 *         time window using midTimestamp taken between batches, we avoid
 *         asserting exact batch sizes and focus instead on monotonicity of
 *         counts (filtered counts not exceeding unfiltered counts) and basic
 *         invariants like total = open + resolved.
 */
export async function test_api_report_statistics_by_target_time_range_filtering(
  connection: api.IConnection,
) {
  // 1. Bootstrap actors: adminUser and memberUser
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const joinHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const joinReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);

  // Admin join
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href: joinHref,
    referrer: joinReferrer,
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Member join
  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: null,
    href: joinHref,
    referrer: joinReferrer,
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create article category as adminUser
  // (connection already authenticated as admin from join)
  const categoryOrder: number & tags.Type<"int32"> = typia.random<
    number & tags.Type<"int32">
  >();

  const categoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    order: categoryOrder,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // 3. Create article as memberUser
  await api.functional.auth.memberUser.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      ip: null,
      href: joinHref,
      referrer: joinReferrer,
    } satisfies IDiscussionBoardMemberUserLogin.IRequest,
  });

  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleBody,
      },
    );
  typia.assert(article);

  // 4. Create two logical batches of reports against the same article
  const createReport = async () => {
    const reportBody = {
      category: RandomGenerator.pick([
        "hate_abuse",
        "harassment",
        "spam",
        "off_topic",
        "dangerous_misleading",
        "other",
      ] as const),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      target_article_id: article.id,
      target_comment_id: undefined,
      target_attachment_id: undefined,
    } satisfies IDiscussionBoardReport.ICreate;

    const report: IDiscussionBoardReport =
      await api.functional.discussionBoard.memberUser.reports.create(
        connection,
        {
          body: reportBody,
        },
      );
    typia.assert(report);
    return report;
  };

  const oldReports: IDiscussionBoardReport[] = [];
  const newReports: IDiscussionBoardReport[] = [];

  // Old batch
  oldReports.push(await createReport());
  oldReports.push(await createReport());

  const midTimestamp: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  // New batch
  newReports.push(await createReport());
  newReports.push(await createReport());

  // 5. Query unfiltered statistics as adminUser
  await api.functional.auth.adminUser.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: joinHref,
      referrer: joinReferrer,
    } satisfies IDiscussionBoardAdminUserLogin.IRequest,
  });

  const unfilteredStats: IDiscussionBoardReportStatisticsByTarget =
    await api.functional.discussionBoard.adminUser.reports.statistics.byTarget.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(unfilteredStats);

  const findArticleBucket = (
    stats: IDiscussionBoardReportStatisticsByTarget,
  ): IDiscussionBoardReportStatisticsByTargetBucket | undefined =>
    stats.buckets.find((bucket) => bucket.targetType === "article");

  const unfilteredArticleBucket = findArticleBucket(unfilteredStats);

  // 6. Query statistics with createdAtFrom filter approximating the new batch
  const filteredStats: IDiscussionBoardReportStatisticsByTarget =
    await api.functional.discussionBoard.adminUser.reports.statistics.byTarget.index(
      connection,
      {
        body: {
          createdAtFrom: midTimestamp,
        } satisfies IDiscussionBoardReportStatisticsByTarget.IRequest,
      },
    );
  typia.assert(filteredStats);

  const filteredArticleBucket = findArticleBucket(filteredStats);

  // 7. Assertions comparing filtered vs unfiltered counts
  if (!unfilteredArticleBucket) {
    TestValidator.equals(
      "no article bucket in filtered stats when none in unfiltered",
      filteredArticleBucket,
      undefined,
    );
    return;
  }

  // Ensure unfiltered article bucket is non-empty to validate scenario impact
  TestValidator.predicate(
    "unfiltered article totalReportCount is positive",
    unfilteredArticleBucket.totalReportCount > 0,
  );

  if (!filteredArticleBucket) {
    // Filtered bucket may disappear when time window excludes all article
    // reports; in that case, just ensure consistency on the unfiltered side.
    TestValidator.equals(
      "unfiltered article total equals open+resolved",
      unfilteredArticleBucket.totalReportCount,
      unfilteredArticleBucket.openReportCount +
        unfilteredArticleBucket.resolvedReportCount,
    );
    return;
  }

  // totalReportCount filtered <= totalReportCount unfiltered
  TestValidator.predicate(
    "filtered article totalReportCount does not exceed unfiltered",
    filteredArticleBucket.totalReportCount <=
      unfilteredArticleBucket.totalReportCount,
  );

  // openReportCount filtered <= openReportCount unfiltered
  TestValidator.predicate(
    "filtered article openReportCount does not exceed unfiltered",
    filteredArticleBucket.openReportCount <=
      unfilteredArticleBucket.openReportCount,
  );

  // resolvedReportCount filtered <= resolvedReportCount unfiltered
  TestValidator.predicate(
    "filtered article resolvedReportCount does not exceed unfiltered",
    filteredArticleBucket.resolvedReportCount <=
      unfilteredArticleBucket.resolvedReportCount,
  );

  // Invariants: total = open + resolved for both
  TestValidator.equals(
    "unfiltered article total equals open+resolved",
    unfilteredArticleBucket.totalReportCount,
    unfilteredArticleBucket.openReportCount +
      unfilteredArticleBucket.resolvedReportCount,
  );

  TestValidator.equals(
    "filtered article total equals open+resolved",
    filteredArticleBucket.totalReportCount,
    filteredArticleBucket.openReportCount +
      filteredArticleBucket.resolvedReportCount,
  );
}
