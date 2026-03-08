import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticleTag";
import type { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import type { IEconomicPoliticalBoardSectionAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSectionAnalytic";
import type { IEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_section_analytics(
  connection: api.IConnection,
): Promise<void> {
  // Import dependencies
  const tags = typia.tags;
  // 1. Test with non-existent section - should return 404
  const fakeSectionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent section returns 404",
    404,
    async () => {
      await api.functional.economicPoliticalBoard.admin.sections.analytics(
        connection,
        {
          sectionId: fakeSectionId,
          body: {},
        },
      );
    },
  );
  // 2. Test successful analytics retrieval
  // Create admin user for testing
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // Update connection with admin token
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: adminAuth.token.access,
  };
  // 3. Test with metric filtering - request only specific metrics
  const testSectionId = typia.random<string & tags.Format<"uuid">>();
  const analyticsResponse =
    await api.functional.economicPoliticalBoard.admin.sections.analytics(
      connection,
      {
        sectionId: testSectionId,
        body: {
          metricFilter: ["articleCount", "commentCount"],
        },
      },
    );
  typia.assert(analyticsResponse);
  // Validate structure - should still return section info but only filtered metrics
  TestValidator.equals(
    "section id matches",
    analyticsResponse.section.id,
    testSectionId,
  );
  TestValidator.predicate(
    "articleCount is non-negative",
    analyticsResponse.articleCount >= 0,
  );
  TestValidator.predicate(
    "commentCount is non-negative",
    analyticsResponse.commentCount >= 0,
  );
  TestValidator.predicate(
    "activeAuthorCount is non-negative",
    analyticsResponse.activeAuthorCount >= 0,
  );
  // Tag distribution should exist but might be empty if section has no articles
  TestValidator.predicate(
    "tagDistribution is array",
    Array.isArray(analyticsResponse.tagDistribution),
  );
  TestValidator.predicate(
    "tagDistribution limited to 10",
    analyticsResponse.tagDistribution.length <= 10,
  );
  // 4. Test with date range filtering
  const startDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 30 days ago
  const analyticsWithDate =
    await api.functional.economicPoliticalBoard.admin.sections.analytics(
      connection,
      {
        sectionId: testSectionId,
        body: {
          startDate,
        },
      },
    );
  typia.assert(analyticsWithDate);
  // Validate date range filtering is applied
  TestValidator.predicate(
    "recentArticleCount is non-negative",
    analyticsWithDate.recentArticleCount >= 0,
  );
  // 5. Test empty section analytics (section with no articles)
  const emptySectionId = typia.random<string & tags.Format<"uuid">>();
  const emptySectionAnalytics =
    await api.functional.economicPoliticalBoard.admin.sections.analytics(
      connection,
      {
        sectionId: emptySectionId,
        body: {},
      },
    );
  typia.assert(emptySectionAnalytics);
  // Validate empty section returns zeros for counts
  TestValidator.equals(
    "empty section articleCount is zero",
    emptySectionAnalytics.articleCount,
    0,
  );
  TestValidator.equals(
    "empty section commentCount is zero",
    emptySectionAnalytics.commentCount,
    0,
  );
  TestValidator.equals(
    "empty section activeAuthorCount is zero",
    emptySectionAnalytics.activeAuthorCount,
    0,
  );
  TestValidator.equals(
    "empty section recentArticleCount is zero",
    emptySectionAnalytics.recentArticleCount,
    0,
  );
  TestValidator.equals(
    "empty section tagDistribution is empty array",
    emptySectionAnalytics.tagDistribution.length,
    0,
  );
}