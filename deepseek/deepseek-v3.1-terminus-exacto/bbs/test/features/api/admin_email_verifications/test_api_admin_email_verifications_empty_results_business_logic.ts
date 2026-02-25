import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminEmailVerification";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminEmailVerification";
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
 * Test administrator email verification search returning empty results with legitimate business logic scenarios, not validation errors.
 */
export async function test_api_admin_email_verifications_empty_results_business_logic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Test scenario 1: verified_at_from set to future date to find not-yet-verified records
  const futureDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 7,
  ).toISOString(); // 7 days in future
  const result1 =
    await api.functional.discussionBoard.admin.admins.email_verifications.index(
      adminConnection,
      {
        body: {
          verified_at_from: futureDate,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminEmailVerification.IRequest,
      },
    );
  typia.assert(result1);
  TestValidator.equals(
    "future date filter returns empty data",
    result1.data.length,
    0,
  );
  TestValidator.equals(
    "future date filter has zero records",
    (result1.pagination as any).records,
    0,
  );
  TestValidator.equals(
    "future date filter has zero pages",
    (result1.pagination as any).pages,
    0,
  );
  TestValidator.equals(
    "future date filter has current page 1",
    (result1.pagination as any).current,
    1,
  );
  TestValidator.equals(
    "future date filter has correct limit",
    (result1.pagination as any).limit,
    10,
  );
  // 3. Test scenario 2: email filter for non-existent administrator email
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const result2 =
    await api.functional.discussionBoard.admin.admins.email_verifications.index(
      adminConnection,
      {
        body: {
          email: nonExistentEmail,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAdminEmailVerification.IRequest,
      },
    );
  typia.assert(result2);
  TestValidator.equals(
    "non-existent email filter returns empty data",
    result2.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent email filter has zero records",
    (result2.pagination as any).records,
    0,
  );
  TestValidator.equals(
    "non-existent email filter has zero pages",
    (result2.pagination as any).pages,
    0,
  );
  TestValidator.equals(
    "non-existent email filter has current page 1",
    (result2.pagination as any).current,
    1,
  );
  TestValidator.equals(
    "non-existent email filter has correct limit",
    (result2.pagination as any).limit,
    20,
  );
  // 4. Test scenario 3: combination of verified status false with administrator_id for a specific admin who has only verified records
  // First, get the current admin's ID
  const result3 =
    await api.functional.discussionBoard.admin.admins.email_verifications.index(
      adminConnection,
      {
        body: {
          administrator_id: admin.id,
          verified: true, // Look for verified records only
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardAdminEmailVerification.IRequest,
      },
    );
  typia.assert(result3);
  // If the admin has any verified records, test that searching for non-verified returns empty
  if (result3.data.length > 0) {
    const result4 =
      await api.functional.discussionBoard.admin.admins.email_verifications.index(
        adminConnection,
        {
          body: {
            administrator_id: admin.id,
            verified: false, // Should return empty if admin only has verified records
            page: 1,
            limit: 5,
          } satisfies IDiscussionBoardAdminEmailVerification.IRequest,
        },
      );
    typia.assert(result4);
    TestValidator.equals(
      "verified false filter returns empty when only verified exist",
      result4.data.length,
      0,
    );
    TestValidator.equals(
      "verified false filter has zero records",
      (result4.pagination as any).records,
      0,
    );
    TestValidator.equals(
      "verified false filter has zero pages",
      (result4.pagination as any).pages,
      0,
    );
    TestValidator.equals(
      "verified false filter has current page 1",
      (result4.pagination as any).current,
      1,
    );
    TestValidator.equals(
      "verified false filter has correct limit",
      (result4.pagination as any).limit,
      5,
    );
  }
}