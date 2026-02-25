import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionArchive";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionArchive";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test basic section archive search functionality for administrators.
 * Verify that an administrator can authenticate, search archived sections with minimal parameters,
 * and receive a properly formatted paginated response.
 */
export async function test_api_admin_sections_archives_basic_search(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Perform basic search with minimal parameters
  const searchResult =
    await api.functional.discussionBoard.admin.sections.archives.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSectionArchive.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate that we received a valid response structure
  TestValidator.predicate(
    "response has pagination property",
    "pagination" in searchResult,
  );
  TestValidator.predicate("response has data property", "data" in searchResult);
  TestValidator.predicate("data is an array", Array.isArray(searchResult.data));
  // Test basic pagination functionality
  TestValidator.predicate(
    "pagination structure exists",
    searchResult.pagination !== undefined,
  );
  // Since the pagination structure is deeply nested, focus on testing the actual data
  if (searchResult.data.length > 0) {
    // If we have data, validate the structure of archive records
    const archive = searchResult.data[0];
    TestValidator.predicate(
      "archive record has required properties",
      "id" in archive &&
        "archivedAt" in archive &&
        "archivedBy" in archive &&
        "reason" in archive &&
        "sectionId" in archive &&
        "section" in archive,
    );
    // Validate section summary structure
    if (archive.section) {
      TestValidator.predicate(
        "section summary has required properties",
        "id" in archive.section &&
          "name" in archive.section &&
          "description" in archive.section &&
          "status" in archive.section &&
          "display_order" in archive.section,
      );
    }
  }
  // Test with different pagination parameters
  const searchResultPage2 =
    await api.functional.discussionBoard.admin.sections.archives.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardSectionArchive.IRequest,
      },
    );
  typia.assert(searchResultPage2);
  TestValidator.predicate(
    "second page search successful",
    "data" in searchResultPage2 && Array.isArray(searchResultPage2.data),
  );
}
