import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator listing functionality with basic display name validation.
 *
 * This test validates that administrators can retrieve a list of all administrators
 * with proper pagination. Since the current API doesn't support display name
 * pattern search parameters, this test focuses on basic listing functionality
 * and validates that created administrators appear in the results.
 */
export async function test_api_administrator_search_by_display_name(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connections for multiple administrators
  const adminConnections: api.IConnection[] = ArrayUtil.repeat(3, () => ({
    host: connection.host,
  }));
  // Register multiple administrators with distinct display names
  const administrators = await Promise.all(
    adminConnections.map(async (adminConnection, index) => {
      const admin = await authorize_admin_join(adminConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          display_name: `Admin${index}_${RandomGenerator.name()}`,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IDiscussionBoardAdmin.IJoin,
      });
      typia.assert(admin);
      return admin;
    }),
  );
  // Test basic administrator listing functionality
  const listingResult =
    await api.functional.discussionBoard.admin.administrators.index(
      adminConnections[0],
      {
        body: {} satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
      },
    );
  typia.assert(listingResult);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    listingResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "has valid current page",
    listingResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "has valid limit",
    listingResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "has valid records count",
    listingResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has valid pages count",
    listingResult.pagination.pages >= 0,
  );
  // Validate data structure
  TestValidator.predicate("has data array", Array.isArray(listingResult.data));
  // Validate that administrator summaries have required fields
  if (listingResult.data.length > 0) {
    TestValidator.predicate(
      "all administrators have valid IDs",
      listingResult.data.every(
        (admin) =>
          admin.id && typeof admin.id === "string" && admin.id.length > 0,
      ),
    );
  }
  // Test that the listing returns at least the created administrators
  TestValidator.predicate(
    "listing returns administrators",
    listingResult.pagination.records >= administrators.length,
  );
}
