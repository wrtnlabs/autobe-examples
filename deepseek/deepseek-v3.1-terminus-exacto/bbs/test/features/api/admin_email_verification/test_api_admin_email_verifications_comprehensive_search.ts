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
 * Test administrator email verification search with comprehensive filtering capabilities.
 */
export async function test_api_admin_email_verifications_comprehensive_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection by registering a new admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Test basic search without filters to get baseline data
  const baseline =
    await api.functional.discussionBoard.admin.admins.email_verifications.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(baseline);
  // Store first verification record for filter testing
  if (baseline.data.length > 0) {
    const firstRecord = baseline.data[0];
    // 3. Test administrator_id filter
    const adminIdFiltered =
      await api.functional.discussionBoard.admin.admins.email_verifications.index(
        adminConnection,
        {
          body: {
            administrator_id: firstRecord.discussion_board_admin_id,
          },
        },
      );
    typia.assert(adminIdFiltered);
    TestValidator.predicate(
      "admin_id filter returns matching records",
      adminIdFiltered.data.length > 0 || baseline.data.length === 0,
    );
    if (adminIdFiltered.data.length > 0) {
      TestValidator.equals(
        "all filtered records match admin_id",
        adminIdFiltered.data.every(
          (r) =>
            r.discussion_board_admin_id ===
            firstRecord.discussion_board_admin_id,
        ),
        true,
      );
    }
    // 4. Test email filter
    const emailFiltered =
      await api.functional.discussionBoard.admin.admins.email_verifications.index(
        adminConnection,
        {
          body: {
            email: firstRecord.email,
          },
        },
      );
    typia.assert(emailFiltered);
    if (emailFiltered.data.length > 0) {
      TestValidator.equals(
        "all filtered records match email",
        emailFiltered.data.every((r) => r.email === firstRecord.email),
        true,
      );
    }
    // 5. Test verified status filter
    const verifiedFiltered =
      await api.functional.discussionBoard.admin.admins.email_verifications.index(
        adminConnection,
        {
          body: {
            verified: firstRecord.verified_at !== null,
          },
        },
      );
    typia.assert(verifiedFiltered);
    if (verifiedFiltered.data.length > 0) {
      TestValidator.predicate(
        "verified filter returns appropriate records",
        verifiedFiltered.data.every(
          (r) =>
            (firstRecord.verified_at !== null && r.verified_at !== null) ||
            (firstRecord.verified_at === null && r.verified_at === null),
        ),
      );
    }
    // 6. Test token partial matching (if token exists)
    if (firstRecord.token.length > 3) {
      const tokenSubstring = firstRecord.token.substring(0, 3);
      const tokenFiltered =
        await api.functional.discussionBoard.admin.admins.email_verifications.index(
          adminConnection,
          {
            body: {
              token: tokenSubstring,
            },
          },
        );
      typia.assert(tokenFiltered);
      // Cannot guarantee matches due to partial matching, but structure should be valid
    }
    // 7. Test date range filtering with created_at_to
    const createdDate = new Date(firstRecord.created_at);
    const nextDay = new Date(createdDate.getTime() + 24 * 60 * 60 * 1000);
    const dateFiltered =
      await api.functional.discussionBoard.admin.admins.email_verifications.index(
        adminConnection,
        {
          body: {
            created_at_to: nextDay.toISOString(),
          },
        },
      );
    typia.assert(dateFiltered);
    // Structure should be valid even if filter returns empty results
    // 8. Test expiration filtering with expired_at_from
    const expirationDate = new Date(firstRecord.expired_at);
    const beforeExpiration = new Date(
      expirationDate.getTime() - 24 * 60 * 60 * 1000,
    );
    const expFiltered =
      await api.functional.discussionBoard.admin.admins.email_verifications.index(
        adminConnection,
        {
          body: {
            expired_at_from: beforeExpiration.toISOString(),
          },
        },
      );
    typia.assert(expFiltered);
    // 9. Test pagination
    const paginated =
      await api.functional.discussionBoard.admin.admins.email_verifications.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: 2,
          },
        },
      );
    typia.assert(paginated);
    TestValidator.predicate(
      "pagination returns at most limit items",
      paginated.data.length <= 2,
    );
    // Fix pagination property access - use data length for validation instead of nested property
    TestValidator.equals(
      "pagination returns correct number of items",
      paginated.data.length,
      Math.min(2, baseline.data.length),
    );
    // 10. Test combined filters
    const combined =
      await api.functional.discussionBoard.admin.admins.email_verifications.index(
        adminConnection,
        {
          body: {
            administrator_id: firstRecord.discussion_board_admin_id,
            email: firstRecord.email,
            page: 1,
            limit: 5,
          },
        },
      );
    typia.assert(combined);
    if (combined.data.length > 0) {
      TestValidator.predicate(
        "combined filters return matching records",
        combined.data.every(
          (r) =>
            r.discussion_board_admin_id ===
              firstRecord.discussion_board_admin_id &&
            r.email === firstRecord.email,
        ),
      );
    }
  }
}
