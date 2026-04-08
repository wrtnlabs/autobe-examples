import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
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

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_customer_ban_list_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(2),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(superAdmin);
  // Step 2: Query ban list with ban_status='all' to retrieve all historical ban records
  const allBansResponse =
    await api.functional.ecommerceMall.superAdministrator.user_ban_of_customers.index(
      adminConnection,
      {
        body: {
          ban_status: "all",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(allBansResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    allBansResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    allBansResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    allBansResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    allBansResponse.pagination.pages >= 0,
  );
  // Validate ban records structure
  if (allBansResponse.data.length > 0) {
    const firstBan = allBansResponse.data[0];
    typia.assert(firstBan);
    // Validate ban subtype structure
    TestValidator.predicate(
      "ban subtype id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstBan.id,
      ),
    );
    TestValidator.predicate(
      "ban subtype created_at is valid date-time",
      !isNaN(Date.parse(firstBan.created_at)),
    );
    TestValidator.predicate(
      "ban subtype updated_at is valid date-time",
      !isNaN(Date.parse(firstBan.updated_at)),
    );
    // Validate ban metadata
    typia.assert(firstBan.ban);
    TestValidator.predicate(
      "ban id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstBan.ban.id,
      ),
    );
    TestValidator.predicate(
      "ban user_type is customer or seller",
      firstBan.ban.user_type === "customer" ||
        firstBan.ban.user_type === "seller",
    );
    TestValidator.predicate(
      "ban reason is non-empty string",
      typeof firstBan.ban.reason === "string" && firstBan.ban.reason.length > 0,
    );
    TestValidator.predicate(
      "ban banned_at is valid date-time",
      !isNaN(Date.parse(firstBan.ban.banned_at)),
    );
    TestValidator.predicate(
      "ban created_at is valid date-time",
      !isNaN(Date.parse(firstBan.ban.created_at)),
    );
    TestValidator.predicate(
      "ban updated_at is valid date-time",
      !isNaN(Date.parse(firstBan.ban.updated_at)),
    );
    TestValidator.predicate(
      "ban_status is active or completed",
      firstBan.ban.ban_status === "active" ||
        firstBan.ban.ban_status === "completed",
    );
    // Validate administrator reference
    typia.assert(firstBan.ban.administrator);
    TestValidator.predicate(
      "administrator id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstBan.ban.administrator.id,
      ),
    );
    TestValidator.predicate(
      "administrator email is valid format",
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(firstBan.ban.administrator.email),
    );
    TestValidator.predicate(
      "administrator display name is non-empty",
      typeof firstBan.ban.administrator.displayName === "string",
    );
    // Validate customer reference
    typia.assert(firstBan.customer);
    TestValidator.predicate(
      "customer id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstBan.customer.id,
      ),
    );
    TestValidator.predicate(
      "customer email is valid format",
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(firstBan.customer.email),
    );
    TestValidator.predicate(
      "customer created_at is valid date-time",
      !isNaN(Date.parse(firstBan.customer.created_at)),
    );
    TestValidator.predicate(
      "customer updated_at is valid date-time",
      !isNaN(Date.parse(firstBan.customer.updated_at)),
    );
    // Validate deleted_at indicates ban status
    if (firstBan.deleted_at !== null) {
      TestValidator.equals(
        "lifted ban has deleted_at timestamp",
        firstBan.ban.ban_status,
        "completed",
      );
      TestValidator.predicate(
        "lifted ban deleted_at is valid date-time",
        !isNaN(Date.parse(firstBan.deleted_at)),
      );
    } else {
      TestValidator.equals(
        "active ban has deleted_at null",
        firstBan.deleted_at,
        null,
      );
      TestValidator.equals(
        "active ban has ban_status active",
        firstBan.ban.ban_status,
        "active",
      );
    }
  }
  // Step 3: Query with ban_status='active' to test active filter
  const activeBansResponse =
    await api.functional.ecommerceMall.superAdministrator.user_ban_of_customers.index(
      adminConnection,
      {
        body: {
          ban_status: "active",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(activeBansResponse);
  // Validate all returned bans are active (no deleted bans in active filter)
  for (const ban of activeBansResponse.data) {
    TestValidator.equals(
      `ban ${ban.id} deleted_at should be null for active filter`,
      ban.deleted_at,
      null,
    );
    TestValidator.equals(
      `ban ${ban.id} should have active status`,
      ban.ban.ban_status,
      "active",
    );
  }
  // Step 4: Test date range filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeResponse =
    await api.functional.ecommerceMall.superAdministrator.user_ban_of_customers.index(
      adminConnection,
      {
        body: {
          banned_at_start: thirtyDaysAgo.toISOString(),
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(dateRangeResponse);
  // Validate date range filtering works (all returned bans should be within range)
  for (const ban of dateRangeResponse.data) {
    TestValidator.predicate(
      `ban ${ban.id} banned_at should be after banned_at_start`,
      new Date(ban.ban.banned_at) >= thirtyDaysAgo,
    );
  }
  // Step 5: Test pagination
  const page2Response =
    await api.functional.ecommerceMall.superAdministrator.user_ban_of_customers.index(
      adminConnection,
      {
        body: {
          ban_status: "all",
          page: 2,
          limit: 5,
        },
      },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 pagination current",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 pagination limit",
    page2Response.pagination.limit,
    5,
  );
  // Step 6: Test search by reason filter
  const reasonSearchResponse =
    await api.functional.ecommerceMall.superAdministrator.user_ban_of_customers.index(
      adminConnection,
      {
        body: {
          reason: "fraud",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(reasonSearchResponse);
  // Validate all returned bans contain the search term in reason
  for (const ban of reasonSearchResponse.data) {
    const reasonLower = ban.ban.reason.toLowerCase();
    TestValidator.predicate(
      `ban ${ban.id} reason should contain search term`,
      reasonLower.includes("fraud"),
    );
  }
  // Step 7: Test customer email search filter
  if (allBansResponse.data.length > 0) {
    const sampleCustomerEmail = allBansResponse.data[0].customer.email;
    const emailSearchResponse =
      await api.functional.ecommerceMall.superAdministrator.user_ban_of_customers.index(
        adminConnection,
        {
          body: {
            customer_email: sampleCustomerEmail,
            page: 1,
            limit: 10,
          },
        },
      );
    typia.assert(emailSearchResponse);
    // Validate all returned bans are for the searched customer
    for (const ban of emailSearchResponse.data) {
      TestValidator.equals(
        `ban ${ban.id} customer email should match`,
        ban.customer.email,
        sampleCustomerEmail,
      );
    }
  }
  // Step 8: Test administrator filter (if admin ID available)
  if (allBansResponse.data.length > 0) {
    const sampleAdminId = allBansResponse.data[0].ban.administrator.id;
    const adminFilterResponse =
      await api.functional.ecommerceMall.superAdministrator.user_ban_of_customers.index(
        adminConnection,
        {
          body: {
            administrator_id: sampleAdminId,
            page: 1,
            limit: 10,
          },
        },
      );
    typia.assert(adminFilterResponse);
    // Validate all returned bans are by the searched administrator
    for (const ban of adminFilterResponse.data) {
      TestValidator.equals(
        `ban ${ban.id} administrator id should match`,
        ban.ban.administrator.id,
        sampleAdminId,
      );
    }
  }
  // Step 9: Test large limit pagination
  const largeLimitResponse =
    await api.functional.ecommerceMall.superAdministrator.user_ban_of_customers.index(
      adminConnection,
      {
        body: {
          ban_status: "all",
          page: 1,
          limit: 100,
        },
      },
    );
  typia.assert(largeLimitResponse);
  TestValidator.equals(
    "large limit pagination limit",
    largeLimitResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "large limit pagination records should be >= returned data",
    largeLimitResponse.pagination.records >= largeLimitResponse.data.length,
  );
  // Step 10: Verify audit trail completeness - all historical ban information preserved
  for (const ban of allBansResponse.data) {
    // Verify ban metadata is complete
    TestValidator.predicate(
      `ban ${ban.id} has ban id`,
      ban.ban.id !== undefined && ban.ban.id !== null,
    );
    TestValidator.predicate(
      `ban ${ban.id} has user_type`,
      ban.ban.user_type !== undefined && ban.ban.user_type !== null,
    );
    TestValidator.predicate(
      `ban ${ban.id} has reason`,
      ban.ban.reason !== undefined && ban.ban.reason !== null,
    );
    TestValidator.predicate(
      `ban ${ban.id} has banned_at`,
      ban.ban.banned_at !== undefined && ban.ban.banned_at !== null,
    );
    // Verify customer information is preserved
    TestValidator.predicate(
      `ban ${ban.id} has customer id`,
      ban.customer.id !== undefined && ban.customer.id !== null,
    );
    TestValidator.predicate(
      `ban ${ban.id} has customer email`,
      ban.customer.email !== undefined && ban.customer.email !== null,
    );
    TestValidator.predicate(
      `ban ${ban.id} has customer display_name`,
      ban.customer.display_name !== undefined,
    );
    // Verify administrator reference is preserved (who issued the ban)
    TestValidator.predicate(
      `ban ${ban.id} has administrator id`,
      ban.ban.administrator.id !== undefined &&
        ban.ban.administrator.id !== null,
    );
    TestValidator.predicate(
      `ban ${ban.id} has administrator display_name`,
      ban.ban.administrator.displayName !== undefined,
    );
    // Verify timestamps are preserved
    TestValidator.predicate(
      `ban ${ban.id} has created_at`,
      ban.created_at !== undefined && ban.created_at !== null,
    );
    TestValidator.predicate(
      `ban ${ban.id} has updated_at`,
      ban.updated_at !== undefined && ban.updated_at !== null,
    );
    // Verify ban status is correctly derived
    if (ban.deleted_at === null) {
      TestValidator.equals(
        `ban ${ban.id} active ban should have ban_status active`,
        ban.ban.ban_status,
        "active",
      );
    } else {
      TestValidator.equals(
        `ban ${ban.id} lifted ban should have ban_status completed`,
        ban.ban.ban_status,
        "completed",
      );
    }
  }
}
