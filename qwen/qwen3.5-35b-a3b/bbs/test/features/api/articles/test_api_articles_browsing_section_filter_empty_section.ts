import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import type { IEconomicPoliticalBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardGuest";
import type { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardArticle";
import type { IPageIEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_articles_browsing_section_filter_empty_section(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Join as guest user
  const guestConnection: api.IConnection = { host: connection.host };
  const guestJoin = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      name: RandomGenerator.name(),
      href: "https://test.example.com",
      referrer: "https://test.example.com",
    } satisfies IEconomicPoliticalBoardGuest.IJoin,
  });
  typia.assert(guestJoin);
  // Step 2: Retrieve all available sections
  const sectionsResponse =
    await api.functional.economicPoliticalBoard.guest.sections.index(
      guestConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEconomicPoliticalBoardSection.IRequest,
      },
    );
  typia.assert(sectionsResponse);
  TestValidator.equals(
    "sections count",
    sectionsResponse.data.length,
    sectionsResponse.pagination.records,
  );
  // Get the first section and another section for testing
  const section1 = sectionsResponse.data[0];
  const section2 = sectionsResponse.data[1] || section1;
  // Step 3: Test empty section filtering
  const emptySectionResponse =
    await api.functional.economicPoliticalBoard.articles.index(
      guestConnection,
      {
        body: {
          sectionId: section1.id,
          page: 1,
          limit: 20,
        } satisfies IEconomicPoliticalBoardArticle.IRequest,
      },
    );
  typia.assert(emptySectionResponse);
  TestValidator.equals(
    "empty section returns 200",
    emptySectionResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty section data array is empty",
    emptySectionResponse.data.length,
    0,
  );
  // Step 4: Test non-empty section filtering
  const nonEmptySectionResponse =
    await api.functional.economicPoliticalBoard.articles.index(
      guestConnection,
      {
        body: {
          sectionId: section2.id,
          page: 1,
          limit: 20,
        } satisfies IEconomicPoliticalBoardArticle.IRequest,
      },
    );
  typia.assert(nonEmptySectionResponse);
  // Validate pagination for filtered results
  TestValidator.equals(
    "non-empty section has correct pagination",
    nonEmptySectionResponse.pagination.records,
    nonEmptySectionResponse.data.length,
  );
  // Validate each article has valid comment count and title
  if (nonEmptySectionResponse.data.length > 0) {
    for (const article of nonEmptySectionResponse.data) {
      TestValidator.predicate(
        "article has valid comment count",
        article.comment_count >= 0,
      );
      TestValidator.predicate(
        "article has valid title",
        article.title.length > 0,
      );
    }
  }
  // Step 5: Test pagination with different page values
  const page2Response =
    await api.functional.economicPoliticalBoard.articles.index(
      guestConnection,
      {
        body: {
          sectionId: section2.id,
          page: 2,
          limit: 5,
        } satisfies IEconomicPoliticalBoardArticle.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 pagination updated",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit respected",
    page2Response.pagination.limit,
    5,
  );
}
