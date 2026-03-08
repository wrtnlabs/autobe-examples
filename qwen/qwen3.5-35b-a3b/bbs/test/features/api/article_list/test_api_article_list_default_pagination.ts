import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import type { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_article_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register test members and create actor-specific connections
  const member1Connection: api.IConnection = { host: connection.host };
  const member1: IEconomicPoliticalBoardMember.IAuthorized =
    await authorize_member_join(member1Connection, {
      body: {
        email: RandomGenerator.alphaNumeric(8) + "@test.com",
        password: "testPassword123!",
        displayName: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: "https://test.com/register",
        referrer: "https://test.com",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(member1);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2: IEconomicPoliticalBoardMember.IAuthorized =
    await authorize_member_join(member2Connection, {
      body: {
        email: RandomGenerator.alphaNumeric(8) + "@test.com",
        password: "testPassword123!",
        displayName: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: "https://test.com/register",
        referrer: "https://test.com",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(member2);
  // Step 2: Test default pagination (no filter parameters)
  // Use base connection for reading articles (no auth required for read)
  const defaultResponse: IPageIEconomicPoliticalBoardArticle.ISummary =
    await api.functional.economicPoliticalBoard.member.articles.index(
      connection,
      {
        body: {}, // Empty body = use all defaults
      },
    );
  typia.assert(defaultResponse);
  // Validate pagination metadata
  TestValidator.predicate(
    "default pagination has current page",
    defaultResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "default pagination has positive limit",
    defaultResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "default pagination has non-negative records",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "default pagination has calculated pages",
    defaultResponse.pagination.pages >= 0,
  );
  // Validate pages calculation
  const expectedPages =
    defaultResponse.pagination.records === 0
      ? 0
      : Math.ceil(
          defaultResponse.pagination.records / defaultResponse.pagination.limit,
        );
  TestValidator.equals(
    "pages calculation",
    defaultResponse.pagination.pages,
    expectedPages,
  );
  // Step 3: Test custom pagination (page=2, pageSize=10)
  const customResponse: IPageIEconomicPoliticalBoardArticle.ISummary =
    await api.functional.economicPoliticalBoard.member.articles.index(
      connection,
      {
        body: {
          page: 2,
          pageSize: 10,
        },
      },
    );
  typia.assert(customResponse);
  // Validate custom pagination metadata
  TestValidator.equals(
    "custom pagination current page",
    customResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "custom pagination limit",
    customResponse.pagination.limit,
    10,
  );
  // Step 4: Validate article summary structure
  if (defaultResponse.data.length > 0) {
    const firstArticle: IEconomicPoliticalBoardArticle.ISummary =
      defaultResponse.data[0];
    typia.assert(firstArticle);
    // Validate required fields exist
    TestValidator.notEquals("article has valid id", firstArticle.id, null);
    TestValidator.notEquals("article has title", firstArticle.title, null);
    TestValidator.notEquals("article has author", firstArticle.author, null);
    TestValidator.notEquals("article has section", firstArticle.section, null);
    TestValidator.notEquals(
      "article has created_at",
      firstArticle.created_at,
      null,
    );
    TestValidator.notEquals(
      "article has updated_at",
      firstArticle.updated_at,
      null,
    );
    // Validate author summary structure
    TestValidator.notEquals("author has id", firstArticle.author.id, null);
    // Validate section summary structure
    TestValidator.notEquals("section has id", firstArticle.section.id, null);
    TestValidator.notEquals(
      "section has name",
      firstArticle.section.name,
      null,
    );
    TestValidator.predicate(
      "section has articleCount",
      firstArticle.section.articleCount >= 0,
    );
    // Validate soft-deleted articles are excluded (deleted_at should be null)
    TestValidator.predicate(
      "article deleted_at is null (not deleted)",
      firstArticle.deleted_at === null,
    );
    // Validate sorting by created_at DESC (newest first)
    if (defaultResponse.data.length > 1) {
      const prevCreated: string = defaultResponse.data[0].created_at;
      const nextCreated: string = defaultResponse.data[1].created_at;
      TestValidator.predicate(
        "articles sorted by created_at DESC",
        prevCreated >= nextCreated,
      );
    }
  }
  // Step 5: Test empty database state
  // Note: We cannot truly test empty database without a delete-all endpoint,
  // but we validate pagination works with 0 records if it occurs
  if (defaultResponse.pagination.records === 0) {
    TestValidator.equals(
      "empty database has 0 pages",
      defaultResponse.pagination.pages,
      0,
    );
    TestValidator.equals(
      "empty database has empty data array",
      defaultResponse.data.length,
      0,
    );
  }
  // Step 6: Validate pagination boundary consistency
  // Verify that pagination metadata is consistent between default and custom requests
  TestValidator.equals(
    "total records consistent across pages",
    defaultResponse.pagination.records,
    customResponse.pagination.records,
  );
}