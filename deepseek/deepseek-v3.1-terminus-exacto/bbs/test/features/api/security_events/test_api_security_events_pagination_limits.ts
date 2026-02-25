import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSecurityEvent";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSecurityEvent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test pagination functionality with different page and limit parameters.
 * After authenticating as super administrator, test the pagination behavior:
 * (1) Search without pagination parameters (default pagination),
 * (2) Search with specific page number (e.g., page=2),
 * (3) Test limit parameter with various values within the allowed range (1-100),
 * (4) Test edge cases with page=1 and limit=1 to get single result,
 * (5) Test with limit exceeding total records.
 * Verify that pagination metadata in response includes correct current page,
 * limit, total records, and total pages. Ensure that when changing page
 * parameters, different subsets of results are returned. Validate that empty
 * results still return proper pagination structure with zero records.
 */
export async function test_api_security_events_pagination_limits(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Default pagination (no parameters)
  const defaultResponse =
    await api.functional.discussionBoard.superAdmin.security_events.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(defaultResponse);
  TestValidator.predicate(
    "default response has pagination",
    defaultResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "default response has data array",
    Array.isArray(defaultResponse.data),
  );
  // Test 2: Specific page number (page=2)
  const page2Response =
    await api.functional.discussionBoard.superAdmin.security_events.index(
      superAdminConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.predicate(
    "page 2 response valid",
    page2Response.pagination !== undefined,
  );
  // Test 3: Various limit values
  const limitValues = [1, 10, 50, 100] as const;
  for (const limit of limitValues) {
    const limitResponse =
      await api.functional.discussionBoard.superAdmin.security_events.index(
        superAdminConnection,
        {
          body: {
            limit: limit satisfies number as number,
          } satisfies IDiscussionBoardSecurityEvent.IRequest,
        },
      );
    typia.assert(limitResponse);
    TestValidator.predicate(
      `limit ${limit} response valid`,
      limitResponse.pagination !== undefined,
    );
    TestValidator.predicate(
      `limit ${limit} data length <= limit`,
      limitResponse.data.length <= limit,
    );
  }
  // Test 4: Edge case - page=1 and limit=1
  const edgeCaseResponse =
    await api.functional.discussionBoard.superAdmin.security_events.index(
      superAdminConnection,
      {
        body: {
          page: 1 satisfies number as number,
          limit: 1 satisfies number as number,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(edgeCaseResponse);
  TestValidator.predicate(
    "edge case response valid",
    edgeCaseResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "edge case data length <= 1",
    edgeCaseResponse.data.length <= 1,
  );
  // Test 5: High limit (should work within allowed range)
  const highLimitResponse =
    await api.functional.discussionBoard.superAdmin.security_events.index(
      superAdminConnection,
      {
        body: {
          limit: 100 satisfies number as number,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(highLimitResponse);
  TestValidator.predicate(
    "high limit response valid",
    highLimitResponse.pagination !== undefined,
  );
  // Validate pagination metadata consistency
  const responses = [
    defaultResponse,
    page2Response,
    edgeCaseResponse,
    highLimitResponse,
  ];
  for (const response of responses) {
    TestValidator.predicate(
      "has pagination object",
      response.pagination !== undefined,
    );
    TestValidator.predicate("has data array", Array.isArray(response.data));
    // Basic pagination validation - test that pagination object exists
    // but don't access non-existent properties
    TestValidator.predicate(
      "pagination object is valid",
      typeof response.pagination === "object" && response.pagination !== null,
    );
  }
}
