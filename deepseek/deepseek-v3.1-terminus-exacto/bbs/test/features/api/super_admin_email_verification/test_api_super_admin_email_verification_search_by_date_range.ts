import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSuperAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSuperAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuperAdminEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test advanced filtering capabilities by searching for email verification records within specific date ranges.
 * After authentication, call the search endpoint with created_at_start and created_at_end parameters spanning a targeted time period.
 * Validate that results are properly filtered to include only records created within the specified range, and test expiration date filtering by using expired_at_start and expired_at_end parameters to find records expiring soon or already expired.
 */
export async function test_api_super_admin_email_verification_search_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super admin using utility function
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Create test date ranges for filtering
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  // Test 1: Search by creation date range (yesterday to tomorrow)
  const creationSearch =
    await api.functional.discussionBoard.superAdmin.super_admins.email_verifications.index(
      superAdminConnection,
      {
        body: {
          created_at_start: yesterday.toISOString(),
          created_at_end: tomorrow.toISOString(),
          limit: 100,
        } satisfies IDiscussionBoardSuperAdminEmailVerification.IRequest,
      },
    );
  typia.assert(creationSearch);
  // Validate that all returned records are within the creation date range
  if (creationSearch.data.length > 0) {
    creationSearch.data.forEach((record) => {
      const createdAt = new Date(record.created_at);
      TestValidator.predicate(
        "creation date within range",
        createdAt >= yesterday && createdAt <= tomorrow,
      );
    });
  }
  // Test 2: Search by expiration date range (today to next week)
  const expirationSearch =
    await api.functional.discussionBoard.superAdmin.super_admins.email_verifications.index(
      superAdminConnection,
      {
        body: {
          expired_at_start: today.toISOString(),
          expired_at_end: nextWeek.toISOString(),
          limit: 100,
        } satisfies IDiscussionBoardSuperAdminEmailVerification.IRequest,
      },
    );
  typia.assert(expirationSearch);
  // Validate that all returned records are within the expiration date range
  if (expirationSearch.data.length > 0) {
    expirationSearch.data.forEach((record) => {
      const expiredAt = new Date(record.expired_at);
      TestValidator.predicate(
        "expiration date within range",
        expiredAt >= today && expiredAt <= nextWeek,
      );
    });
  }
  // Test 3: Search by both creation and expiration date ranges
  const combinedSearch =
    await api.functional.discussionBoard.superAdmin.super_admins.email_verifications.index(
      superAdminConnection,
      {
        body: {
          created_at_start: yesterday.toISOString(),
          created_at_end: today.toISOString(),
          expired_at_start: tomorrow.toISOString(),
          expired_at_end: nextWeek.toISOString(),
          limit: 100,
        } satisfies IDiscussionBoardSuperAdminEmailVerification.IRequest,
      },
    );
  typia.assert(combinedSearch);
  // Validate combined date range filtering
  if (combinedSearch.data.length > 0) {
    combinedSearch.data.forEach((record) => {
      const createdAt = new Date(record.created_at);
      const expiredAt = new Date(record.expired_at);
      TestValidator.predicate(
        "combined creation date filtering",
        createdAt >= yesterday && createdAt <= today,
      );
      TestValidator.predicate(
        "combined expiration date filtering",
        expiredAt >= tomorrow && expiredAt <= nextWeek,
      );
    });
  }
  // Test 4: Verify pagination metadata is present
  TestValidator.predicate(
    "pagination metadata exists",
    creationSearch.pagination !== undefined,
  );
  TestValidator.equals(
    "pagination has current page",
    creationSearch.pagination.pagination.pagination.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has records count",
    creationSearch.pagination.pagination.pagination.pagination.records >= 0,
  );
}
