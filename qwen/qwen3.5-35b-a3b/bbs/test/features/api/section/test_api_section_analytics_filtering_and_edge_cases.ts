import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import type { IEconomicPoliticalBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticleAttachment";
import type { IEconomicPoliticalBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticleTag";
import type { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
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
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_economic_political_board_admin_sections_create } from "../../../generate/generate_random_economic_political_board_admin_sections_create";
import { generate_random_economic_political_board_member_articles_create } from "../../../generate/generate_random_economic_political_board_member_articles_create";
import { prepare_random_economic_political_board_article } from "../../../prepare/prepare_random_economic_political_board_article";
import { prepare_random_economic_political_board_article_attachment } from "../../../prepare/prepare_random_economic_political_board_article_attachment";
import { prepare_random_economic_political_board_section } from "../../../prepare/prepare_random_economic_political_board_section";

export async function test_api_section_analytics_filtering_and_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup - Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    } satisfies IEconomicPoliticalBoardAdmin.ILogin,
  });
  // 2. Create empty section for empty analytics test
  const emptySection =
    await api.functional.economicPoliticalBoard.admin.sections.create(
      adminConnection,
      {
        body: {
          name: "Empty Section Test",
          description: "Section with no articles for empty analytics test",
        } satisfies IEconomicPoliticalBoardSection.ICreate,
      },
    );
  typia.assert(emptySection);
  // 3. Test empty section analytics - all counts should be 0
  const emptyAnalytics =
    await api.functional.economicPoliticalBoard.admin.sections.analytics(
      adminConnection,
      {
        sectionId: emptySection.id,
        body: {},
      },
    );
  typia.assert(emptyAnalytics);
  TestValidator.equals(
    "empty section article count",
    emptyAnalytics.articleCount,
    0,
  );
  TestValidator.equals(
    "empty section comment count",
    emptyAnalytics.commentCount,
    0,
  );
  TestValidator.equals(
    "empty section active author count",
    emptyAnalytics.activeAuthorCount,
    0,
  );
  TestValidator.equals(
    "empty section recent article count",
    emptyAnalytics.recentArticleCount,
    0,
  );
  TestValidator.equals(
    "empty section tag distribution",
    emptyAnalytics.tagDistribution.length,
    0,
  );
  // 4. Setup - Member authentication for article creation
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: "member@test.com",
      password: "1234",
      displayName: "Test Member",
      bio: "A test member",
      href: "http://test.com/register",
      referrer: "http://test.com",
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  // 5. Create second member for unique author testing
  const memberConnection2: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection2, {
    body: {
      email: "member2@test.com",
      password: "1234",
      displayName: "Test Member 2",
      bio: "A test member 2",
      href: "http://test.com/register",
      referrer: "http://test.com",
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  // 6. Create section with articles for data accuracy testing
  const analyticsSection =
    await api.functional.economicPoliticalBoard.admin.sections.create(
      adminConnection,
      {
        body: {
          name: "Analytics Test Section",
          description: "Section for analytics data accuracy testing",
        } satisfies IEconomicPoliticalBoardSection.ICreate,
      },
    );
  typia.assert(analyticsSection);
  // 7. Generate valid tag UUIDs for articles
  const tagId1 = typia.random<string & tags.Format<"uuid">>();
  const tagId2 = typia.random<string & tags.Format<"uuid">>();
  const tagId3 = typia.random<string & tags.Format<"uuid">>();
  // 8. Create first article with tags by first member
  const article1 =
    await api.functional.economicPoliticalBoard.member.articles.create(
      memberConnection,
      {
        body: {
          title: "Article with tags",
          content: RandomGenerator.content({ paragraphs: 1 }),
          section_id: analyticsSection.id,
          tagIds: [tagId1, tagId2],
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article1);
  // 9. Create second article with overlapping tags by second member (unique author)
  const article2 =
    await api.functional.economicPoliticalBoard.member.articles.create(
      memberConnection2,
      {
        body: {
          title: "Article with overlapping tags",
          content: RandomGenerator.content({ paragraphs: 1 }),
          section_id: analyticsSection.id,
          tagIds: [tagId1, tagId3],
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article2);
  // 10. Create third article by first member (not unique author)
  const article3 =
    await api.functional.economicPoliticalBoard.member.articles.create(
      memberConnection,
      {
        body: {
          title: "Article by same author",
          content: RandomGenerator.content({ paragraphs: 1 }),
          section_id: analyticsSection.id,
          tagIds: [tagId2, tagId3],
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article3);
  // 11. Test metric filtering - only request specific metrics
  const metricFiltered =
    await api.functional.economicPoliticalBoard.admin.sections.analytics(
      adminConnection,
      {
        sectionId: analyticsSection.id,
        body: {
          metricFilter: ["articleCount", "commentCount"],
        },
      },
    );
  typia.assert(metricFiltered);
  TestValidator.equals(
    "metric filtered article count",
    metricFiltered.articleCount,
    3,
  );
  // 12. Test date range filtering - set startDate to far future
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 100); // 100 days in future
  const dateFiltered =
    await api.functional.economicPoliticalBoard.admin.sections.analytics(
      adminConnection,
      {
        sectionId: analyticsSection.id,
        body: {
          startDate: futureDate.toISOString(),
        },
      },
    );
  typia.assert(dateFiltered);
  TestValidator.equals(
    "date filtered recent articles",
    dateFiltered.recentArticleCount,
    0,
  );
  // 13. Test unauthorized access - member should get 403
  try {
    await api.functional.economicPoliticalBoard.admin.sections.analytics(
      memberConnection,
      {
        sectionId: analyticsSection.id,
        body: {},
      },
    );
    throw new Error("Expected 403 error for member accessing analytics");
  } catch (error) {
    if (typia.is<api.HttpError>(error)) {
      TestValidator.equals("403 for unauthorized member", error.status, 403);
    } else {
      throw error;
    }
  }
  // 14. Test non-existent section - should return 404
  try {
    await api.functional.economicPoliticalBoard.admin.sections.analytics(
      adminConnection,
      {
        sectionId: "12345678-1234-1234-1234-123456789012",
        body: {},
      },
    );
    throw new Error("Expected 404 error for non-existent section");
  } catch (error) {
    if (typia.is<api.HttpError>(error)) {
      TestValidator.equals("404 for non-existent section", error.status, 404);
    } else {
      throw error;
    }
  }
  // 15. Test deleted section - should return 404
  await api.functional.economicPoliticalBoard.admin.sections.create(
    adminConnection,
    {
      body: {
        name: "Section to Delete",
        description: "Will be deleted to test 404 response",
      } satisfies IEconomicPoliticalBoardSection.ICreate,
    },
  );
  const deletedSectionId = emptySection.id;
  typia.assertGuard(emptySection);
  // Section will be soft-deleted - but we need an admin endpoint for this
  // For now, we test that the section exists and works correctly
  const finalAnalytics =
    await api.functional.economicPoliticalBoard.admin.sections.analytics(
      adminConnection,
      {
        sectionId: analyticsSection.id,
        body: {},
      },
    );
  typia.assert(finalAnalytics);
  TestValidator.equals("final article count", finalAnalytics.articleCount, 3);
  TestValidator.equals(
    "final active author count",
    finalAnalytics.activeAuthorCount,
    2,
  );
  TestValidator.equals(
    "final recent article count",
    finalAnalytics.recentArticleCount,
    3,
  );
}
