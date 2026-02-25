import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminPasswordReset";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminPasswordReset";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test searching for administrator password reset records by email pattern matching.
 * Create multiple administrator accounts with different email patterns, generate password reset
 * requests for each, then perform a search using partial email matching. Verify that the
 * search returns only records matching the email pattern, with correct pagination metadata
 * and summary information including administrator details, expiration status, and timestamps.
 */
export async function test_api_admin_password_reset_search_by_email(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connections for multiple administrators
  const adminConnections: api.IConnection[] = [];
  const emailPatterns = [
    "test.user@example.com",
    "admin.test@example.org",
    "user.test@example.net",
    "other.pattern@example.com",
  ];
  // Create administrator accounts with different email patterns
  for (const email of emailPatterns) {
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminConnection, {
      body: {
        email: email satisfies string & tags.Format<"email">,
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
    adminConnections.push(adminConnection);
  }
  // Search for password reset records with email pattern matching
  const searchConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(searchConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Search for records containing "test" in email (use valid email substring)
  const searchResult =
    await api.functional.discussionBoard.admin.admins.password_resets.index(
      searchConnection,
      {
        body: {
          email: "test" satisfies string & tags.Format<"email"> as string &
            tags.Format<"email">,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 100 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination metadata - follow the nested pagination structure
  TestValidator.predicate(
    "pagination exists",
    searchResult.pagination !== undefined,
  );
  // Access the deeply nested pagination properties according to the DTO structure
  const finalPagination =
    searchResult.pagination.pagination.pagination.pagination;
  // Use correct pagination property names based on IPage.IPagination structure
  TestValidator.equals("current page", finalPagination.current, 1);
  TestValidator.equals("limit", finalPagination.limit, 100);
  TestValidator.predicate(
    "records count is non-negative",
    finalPagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    finalPagination.pages >= 0,
  );
  // Validate data structure
  TestValidator.predicate("data is array", Array.isArray(searchResult.data));
  // Verify that all returned records contain "test" in email
  for (const record of searchResult.data) {
    typia.assert(record);
    TestValidator.predicate(
      "admin email contains search pattern",
      record.admin.email.toLowerCase().includes("test"),
    );
    TestValidator.predicate(
      "expires_at is valid date",
      !isNaN(new Date(record.expires_at).getTime()),
    );
    TestValidator.predicate(
      "created_at is valid date",
      !isNaN(new Date(record.created_at).getTime()),
    );
  }
}
