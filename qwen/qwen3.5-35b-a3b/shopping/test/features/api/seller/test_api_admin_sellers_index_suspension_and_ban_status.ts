import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_sellers_index_suspension_and_ban_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: typia.random<IEcommerceMallAdmin.IJoin>(),
  });
  typia.assert(adminAuth);
  // 2. Test filter: isSuspended=true
  // Get all suspended sellers and verify they are all suspended
  const suspendedFilterRequest = {
    isSuspended: true,
    limit: 100,
  } satisfies IEcommerceMallSeller.IRequest;
  const suspendedFilterResponse =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: suspendedFilterRequest,
    });
  typia.assert(suspendedFilterResponse);
  // All returned sellers must be suspended
  for (const seller of suspendedFilterResponse.data) {
    TestValidator.equals(
      "suspended seller is_suspended flag",
      seller.is_suspended,
      true,
    );
  }
  // 3. Test filter: isBanned=true
  // Get all banned sellers and verify they are all banned
  const bannedFilterRequest = {
    isBanned: true,
    limit: 100,
  } satisfies IEcommerceMallSeller.IRequest;
  const bannedFilterResponse =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: bannedFilterRequest,
    });
  typia.assert(bannedFilterResponse);
  // All returned sellers must be banned
  for (const seller of bannedFilterResponse.data) {
    TestValidator.equals(
      "banned seller is_banned flag",
      seller.is_banned,
      true,
    );
  }
  // 4. Test combined filter: isSuspended=true AND isBanned=false
  const suspendedNotBannedFilterRequest = {
    isSuspended: true,
    isBanned: false,
    limit: 100,
  } satisfies IEcommerceMallSeller.IRequest;
  const suspendedNotBannedFilterResponse =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: suspendedNotBannedFilterRequest,
    });
  typia.assert(suspendedNotBannedFilterResponse);
  // All returned sellers must be suspended but not banned
  for (const seller of suspendedNotBannedFilterResponse.data) {
    TestValidator.equals(
      "suspended not banned seller is_suspended flag",
      seller.is_suspended,
      true,
    );
    TestValidator.equals(
      "suspended not banned seller is_banned flag",
      seller.is_banned,
      false,
    );
  }
  // 5. Test combined filter: isSuspended=false AND isBanned=true
  const notSuspendedBannedFilterRequest = {
    isSuspended: false,
    isBanned: true,
    limit: 100,
  } satisfies IEcommerceMallSeller.IRequest;
  const notSuspendedBannedFilterResponse =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: notSuspendedBannedFilterRequest,
    });
  typia.assert(notSuspendedBannedFilterResponse);
  // All returned sellers must be banned but not suspended
  for (const seller of notSuspendedBannedFilterResponse.data) {
    TestValidator.equals(
      "not suspended banned seller is_suspended flag",
      seller.is_suspended,
      false,
    );
    TestValidator.equals(
      "not suspended banned seller is_banned flag",
      seller.is_banned,
      true,
    );
  }
  // 6. Test filter: isSuspended=false AND isBanned=false (active sellers)
  const activeOnlyFilterRequest = {
    isSuspended: false,
    isBanned: false,
    limit: 100,
  } satisfies IEcommerceMallSeller.IRequest;
  const activeOnlyFilterResponse =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: activeOnlyFilterRequest,
    });
  typia.assert(activeOnlyFilterResponse);
  // All returned sellers must be active (not suspended, not banned)
  for (const seller of activeOnlyFilterResponse.data) {
    TestValidator.equals(
      "active seller is_suspended flag",
      seller.is_suspended,
      false,
    );
    TestValidator.equals(
      "active seller is_banned flag",
      seller.is_banned,
      false,
    );
  }
  // 7. Validate pagination metadata is correct for filtered results
  // Check that pagination records reflect the filtered count
  TestValidator.equals(
    "suspended filter pagination records",
    suspendedFilterResponse.pagination.records,
    suspendedFilterResponse.data.length,
  );
  TestValidator.equals(
    "banned filter pagination records",
    bannedFilterResponse.pagination.records,
    bannedFilterResponse.data.length,
  );
  TestValidator.equals(
    "suspended not banned filter pagination records",
    suspendedNotBannedFilterResponse.pagination.records,
    suspendedNotBannedFilterResponse.data.length,
  );
  TestValidator.equals(
    "not suspended banned filter pagination records",
    notSuspendedBannedFilterResponse.pagination.records,
    notSuspendedBannedFilterResponse.data.length,
  );
  TestValidator.equals(
    "active only filter pagination records",
    activeOnlyFilterResponse.pagination.records,
    activeOnlyFilterResponse.data.length,
  );
  // 8. Validate that each page has correct pagination metadata
  for (const response of [
    suspendedFilterResponse,
    bannedFilterResponse,
    suspendedNotBannedFilterResponse,
    notSuspendedBannedFilterResponse,
    activeOnlyFilterResponse,
  ]) {
    // Validate pagination structure
    TestValidator.predicate(
      "pagination has current page",
      response.pagination.current > 0,
    );
    TestValidator.predicate(
      "pagination has limit",
      response.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination has records",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination has pages",
      response.pagination.pages >= 0,
    );
  }
}
