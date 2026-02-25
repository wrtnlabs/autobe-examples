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
 * Test the email verification search functionality by filtering for pending verification records only.
 * 1. Authenticate as superAdmin using the join endpoint to establish credentials
 * 2. Call the search endpoint with verification_status='pending' to retrieve only unconfirmed email verification records
 * 3. Validate that the response contains only records where verified_at is null
 * 4. Verify pagination metadata is correct
 * 5. Check that all summary fields are properly populated
 */
export async function test_api_super_admin_email_verification_search_pending_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authorized);
  // 2. Search for pending email verifications
  const searchResults =
    await api.functional.discussionBoard.superAdmin.super_admins.email_verifications.index(
      superAdminConnection,
      {
        body: {
          verification_status: "pending",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardSuperAdminEmailVerification.IRequest,
      },
    );
  typia.assert(searchResults);
  // 3. Validate response structure exists
  TestValidator.predicate(
    "pagination metadata should exist",
    !!searchResults.pagination,
  );
  TestValidator.predicate(
    "data array should exist",
    Array.isArray(searchResults.data),
  );
  // 4. Validate data content - all records should have pending status
  for (const record of searchResults.data) {
    TestValidator.equals(
      "verification status should be pending",
      record.verification_status,
      "pending",
    );
    TestValidator.equals(
      "verified_at should be null for pending records",
      record.verified_at,
      null,
    );
    // Validate created_at is before expired_at for pending records
    if (record.created_at && record.expired_at) {
      TestValidator.predicate(
        "created_at should be before expired_at",
        new Date(record.created_at) < new Date(record.expired_at),
      );
    }
  }
  // 5. Validate pagination structure exists
  TestValidator.predicate(
    "pagination object should exist",
    searchResults.pagination !== null && searchResults.pagination !== undefined,
  );
}
