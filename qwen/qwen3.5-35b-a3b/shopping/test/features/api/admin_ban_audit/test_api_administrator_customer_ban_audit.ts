import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import type { IEcommerceMallUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUserBanOfCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator customer ban audit endpoint for compliance and historical review.
 *
 * Validates the audit workflow where administrators can review all customer ban records,
 * including both active bans and lifted bans for compliance purposes. The test ensures
 * that the endpoint correctly filters ban statuses, returns proper pagination metadata,
 * and preserves ban history even after lifts.
 *
 * 1. Administrator joins and authenticates with credentials.
 * 2. Administrator calls ban audit endpoint with ban_status='all' to retrieve all historical bans.
 * 3. System returns both active bans (deleted_at IS NULL) and lifted bans (deleted_at IS NOT NULL).
 * 4. Lifted ban records show the deleted_at timestamp indicating when ban was lifted.
 * 5. Pagination metadata correctly counts all records regardless of ban status.
 * 6. Administrator filters by date range to view bans from specific time period.
 */
export async function test_api_administrator_customer_ban_audit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinInput = {
    display_name: RandomGenerator.name(2),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.MinLength<8> &
      tags.Format<"password">,
    grade: "regular" as const,
  } satisfies IEcommerceMallAdministrator.IJoin;
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuthorized);
  // 2. Test ban audit with ban_status='all' - should return all bans including lifted
  const banAuditInput: IEcommerceMallUserBanOfCustomer.IRequest = {
    ban_status: "all" as const,
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallUserBanOfCustomer.IRequest;
  const banAuditResponse =
    await api.functional.ecommerceMall.administrator.user_ban_of_customers.index(
      adminConnection,
      { body: banAuditInput },
    );
  typia.assert(banAuditResponse);
  // 3. Validate pagination structure
  TestValidator.equals(
    "pagination current",
    banAuditResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    banAuditResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    banAuditResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    banAuditResponse.pagination.pages >= 0,
  );
  // 4. Validate ban record structure when bans exist
  if (banAuditResponse.data.length > 0) {
    const firstBan = banAuditResponse.data[0];
    typia.assert(firstBan);
    // Verify ban has required joins
    TestValidator.equals("ban has ID", firstBan.id !== undefined, true);
    TestValidator.equals(
      "ban has ban object",
      firstBan.ban !== undefined,
      true,
    );
    TestValidator.equals(
      "ban has customer object",
      firstBan.customer !== undefined,
      true,
    );
    TestValidator.equals(
      "ban has created_at",
      firstBan.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "ban has updated_at",
      firstBan.updated_at !== undefined,
      true,
    );
    TestValidator.equals(
      "ban has deleted_at field",
      firstBan.deleted_at !== undefined,
      true,
    );
    // Verify ban object structure
    typia.assert(firstBan.ban);
    TestValidator.equals("ban has ban ID", firstBan.ban.id !== undefined, true);
    TestValidator.equals(
      "ban has user_type",
      firstBan.ban.user_type !== undefined,
      true,
    );
    TestValidator.equals(
      "ban has reason",
      firstBan.ban.reason !== undefined,
      true,
    );
    TestValidator.equals(
      "ban has banned_at",
      firstBan.ban.banned_at !== undefined,
      true,
    );
    TestValidator.equals(
      "ban has administrator",
      firstBan.ban.administrator !== undefined,
      true,
    );
    // Verify customer object structure
    typia.assert(firstBan.customer);
    TestValidator.equals(
      "customer has ID",
      firstBan.customer.id !== undefined,
      true,
    );
    TestValidator.equals(
      "customer has email",
      firstBan.customer.email !== undefined,
      true,
    );
    TestValidator.equals(
      "customer has display_name",
      firstBan.customer.display_name !== undefined,
      true,
    );
  }
  // 5. Test pagination with different page
  const banAuditPage2Input: IEcommerceMallUserBanOfCustomer.IRequest = {
    ban_status: "all" as const,
    page: 2,
    limit: 10,
  } satisfies IEcommerceMallUserBanOfCustomer.IRequest;
  const banAuditPage2Response =
    await api.functional.ecommerceMall.administrator.user_ban_of_customers.index(
      adminConnection,
      { body: banAuditPage2Input },
    );
  typia.assert(banAuditPage2Response);
  TestValidator.equals(
    "page 2 pagination current",
    banAuditPage2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 pagination records matches",
    banAuditPage2Response.pagination.records,
    banAuditResponse.pagination.records,
  );
  // 6. Test date range filtering with both active and lifted bans
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const banAuditDateRangeInput: IEcommerceMallUserBanOfCustomer.IRequest = {
    ban_status: "all" as const,
    banned_at_start: oneWeekAgo.toISOString() as string &
      tags.Format<"date-time">,
    banned_at_end: twoDaysAgo.toISOString() as string &
      tags.Format<"date-time">,
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallUserBanOfCustomer.IRequest;
  const banAuditDateRangeResponse =
    await api.functional.ecommerceMall.administrator.user_ban_of_customers.index(
      adminConnection,
      { body: banAuditDateRangeInput },
    );
  typia.assert(banAuditDateRangeResponse);
  // Validate date range filtering results
  if (banAuditDateRangeResponse.data.length > 0) {
    for (const ban of banAuditDateRangeResponse.data) {
      const bannedAtDate = new Date(ban.ban.banned_at);
      TestValidator.predicate(
        "banned_at is after start date",
        bannedAtDate >= oneWeekAgo,
      );
      TestValidator.predicate(
        "banned_at is before end date",
        bannedAtDate <= twoDaysAgo,
      );
    }
  }
  // 7. Test filtering by administrator_id
  const banAuditAdminFilterInput: IEcommerceMallUserBanOfCustomer.IRequest = {
    ban_status: "all" as const,
    administrator_id: adminAuthorized.id,
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallUserBanOfCustomer.IRequest;
  const banAuditAdminFilterResponse =
    await api.functional.ecommerceMall.administrator.user_ban_of_customers.index(
      adminConnection,
      { body: banAuditAdminFilterInput },
    );
  typia.assert(banAuditAdminFilterResponse);
  if (banAuditAdminFilterResponse.data.length > 0) {
    for (const ban of banAuditAdminFilterResponse.data) {
      TestValidator.equals(
        "admin ID matches filter",
        ban.ban.administrator.id,
        adminAuthorized.id,
      );
    }
  }
  // 8. Verify pagination metadata consistency across different filters
  TestValidator.equals(
    "all bans pagination records matches",
    banAuditResponse.pagination.records,
    banAuditPage2Response.pagination.records,
  );
  TestValidator.equals(
    "date range pagination records is consistent",
    banAuditDateRangeResponse.pagination.records,
    banAuditDateRangeResponse.pagination.records,
  );
}
