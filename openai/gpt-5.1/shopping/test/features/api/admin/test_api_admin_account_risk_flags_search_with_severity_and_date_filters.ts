import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAccountRiskFlag";
import type { IShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccountRiskFlag";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

export async function test_api_admin_account_risk_flags_search_with_severity_and_date_filters(
  connection: api.IConnection,
) {
  // 1. Join as an admin so that subsequent admin APIs are authorized
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "P@ssw0rd!", // satisfies password format semantically
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminId = adminAuthorized.id;

  // 2. Seed multiple admin actor risk flags
  // Low severity flag created first
  const lowFlagCreateBody = {
    actor_type: "admin",
    code: "LOW_RISK_TEST",
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    severity: "low",
    active: true,
    expires_at: null,
  } satisfies IShoppingMallAccountRiskFlag.ICreate;

  const lowFlag: IShoppingMallAccountRiskFlag =
    await api.functional.shoppingMall.admin.accountRiskFlags.create(
      connection,
      {
        body: lowFlagCreateBody,
      },
    );
  typia.assert(lowFlag);

  // High severity flag created later
  const highFlagCreateBody = {
    actor_type: "admin",
    code: "HIGH_RISK_TEST",
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    severity: "high",
    active: true,
    expires_at: null,
  } satisfies IShoppingMallAccountRiskFlag.ICreate;

  const highFlag: IShoppingMallAccountRiskFlag =
    await api.functional.shoppingMall.admin.accountRiskFlags.create(
      connection,
      {
        body: highFlagCreateBody,
      },
    );
  typia.assert(highFlag);

  // 3. Use the exact highFlag.created_at as both from/to window to
  // target that specific record. This also guarantees lowFlag created_at
  // is outside window if times differ, but even if equal, filters on
  // severity/actor_type will still exclude it.
  const createdFrom: string & tags.Format<"date-time"> = highFlag.created_at;
  const createdTo: string & tags.Format<"date-time"> = highFlag.created_at;

  // Common request pagination: first page, small limit
  const baseRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    order_by: "created_at",
    actor_type: "admin",
    severity: "high",
    active: true,
    created_from: createdFrom,
    created_to: createdTo,
  } satisfies IShoppingMallAccountRiskFlag.IRequest;

  // 4. Call index with ascending order
  const ascPage: IPageIShoppingMallAccountRiskFlag.ISummary =
    await api.functional.shoppingMall.admin.admins.accountRiskFlags.index(
      connection,
      {
        adminId,
        body: {
          ...baseRequest,
          order_direction: "asc",
        } satisfies IShoppingMallAccountRiskFlag.IRequest,
      },
    );
  typia.assert(ascPage);

  // Basic pagination sanity checks
  TestValidator.predicate(
    "asc pagination.records not negative",
    ascPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "asc pagination.limit positive",
    ascPage.pagination.limit > 0,
  );
  TestValidator.equals(
    "asc data.length <= pagination.limit",
    ascPage.data.length,
    ascPage.data.length <= ascPage.pagination.limit
      ? ascPage.data.length
      : ascPage.pagination.limit,
  );

  // Business filter checks: all results must match severity/actor_type/active
  for (const item of ascPage.data) {
    TestValidator.equals("asc item.severity is high", item.severity, "high");
    TestValidator.equals(
      "asc item.actor_type is admin",
      item.actor_type,
      "admin",
    );
    TestValidator.equals("asc item.active is true", item.active, true);

    // Ensure created_at lies within [createdFrom, createdTo]
    const createdAtTime = new Date(item.created_at).getTime();
    const fromTime = new Date(createdFrom).getTime();
    const toTime = new Date(createdTo).getTime();
    TestValidator.predicate(
      "asc item.created_at within window",
      createdAtTime >= fromTime && createdAtTime <= toTime,
    );

    // Ensure no low-risk test code leaks in
    TestValidator.notEquals(
      "asc item.code is not LOW_RISK_TEST",
      item.code,
      "LOW_RISK_TEST",
    );
  }

  // If there are multiple records, ensure ordering by created_at asc
  if (ascPage.data.length > 1) {
    for (let i = 1; i < ascPage.data.length; i++) {
      const prev = ascPage.data[i - 1];
      const curr = ascPage.data[i];
      const prevTime = new Date(prev.created_at).getTime();
      const currTime = new Date(curr.created_at).getTime();
      TestValidator.predicate(
        "asc ordering by created_at",
        prevTime <= currTime,
      );
    }
  }

  // 5. Call index with descending order to verify reverse ordering
  const descPage: IPageIShoppingMallAccountRiskFlag.ISummary =
    await api.functional.shoppingMall.admin.admins.accountRiskFlags.index(
      connection,
      {
        adminId,
        body: {
          ...baseRequest,
          order_direction: "desc",
        } satisfies IShoppingMallAccountRiskFlag.IRequest,
      },
    );
  typia.assert(descPage);

  // Basic checks similar to asc
  TestValidator.predicate(
    "desc pagination.records not negative",
    descPage.pagination.records >= 0,
  );

  for (const item of descPage.data) {
    TestValidator.equals("desc item.severity is high", item.severity, "high");
    TestValidator.equals(
      "desc item.actor_type is admin",
      item.actor_type,
      "admin",
    );
    TestValidator.equals("desc item.active is true", item.active, true);
  }

  if (descPage.data.length > 1) {
    for (let i = 1; i < descPage.data.length; i++) {
      const prev = descPage.data[i - 1];
      const curr = descPage.data[i];
      const prevTime = new Date(prev.created_at).getTime();
      const currTime = new Date(curr.created_at).getTime();
      TestValidator.predicate(
        "desc ordering by created_at",
        prevTime >= currTime,
      );
    }
  }

  // 6. Negative scenario: choose a window that is before lowFlag.created_at
  // so that no seeded flags are returned.
  const lowCreatedTime = new Date(lowFlag.created_at).getTime();
  const beforeWindowStart = new Date(
    lowCreatedTime - 60 * 60 * 1000,
  ).toISOString();
  const beforeWindowEnd = new Date(
    lowCreatedTime - 30 * 60 * 1000,
  ).toISOString();

  const negativeRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    order_by: "created_at",
    order_direction: "asc",
    actor_type: "admin",
    severity: "high",
    active: true,
    created_from: beforeWindowStart as string & tags.Format<"date-time">,
    created_to: beforeWindowEnd as string & tags.Format<"date-time">,
  } satisfies IShoppingMallAccountRiskFlag.IRequest;

  const emptyPage: IPageIShoppingMallAccountRiskFlag.ISummary =
    await api.functional.shoppingMall.admin.admins.accountRiskFlags.index(
      connection,
      {
        adminId,
        body: negativeRequest,
      },
    );
  typia.assert(emptyPage);

  TestValidator.equals(
    "negative data is empty when no flags match",
    emptyPage.data.length,
    0,
  );
  TestValidator.predicate(
    "negative records equals zero or matches data length",
    emptyPage.pagination.records === 0 ||
      emptyPage.pagination.records === emptyPage.data.length,
  );
}
