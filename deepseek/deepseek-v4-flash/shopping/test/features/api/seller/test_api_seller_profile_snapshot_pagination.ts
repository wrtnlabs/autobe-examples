import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfileSnapshot";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test seller profile snapshot pagination as a super administrator.
 *
 * Validates the pagination endpoint for seller profile snapshots by calling it with different page and limit parameters. The test authenticates as a super administrator using the authorization utility, then calls the endpoint with various pagination configurations to verify that the response structure and pagination metadata are correct.
 *
 * Since no SDK functions are available to create sellers or generate profile snapshots (which require seller profile edits), the test uses a randomly generated seller identifier and focuses on validating the pagination API's structural response rather than snapshot content.
 *
 * 1. Authenticate as super administrator via the authorization utility.
 * 2. Call the endpoint with page=1 and limit=5, validating the response structure and pagination metadata (current=1, limit=5, records>=0, pages>=0).
 * 3. Call the endpoint with page=2 and limit=5, validating pagination metadata (current=2, limit=5).
 * 4. Call the endpoint with page=1 and limit=100 (maximum allowed), validating the endpoint accepts up to 100 items per page.
 */
export async function test_api_seller_profile_snapshot_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdministrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(adminConnection, {});
  // 2. Generate a seller identifier
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Test page 1 with limit 5
  const page1: IPageIECommerceMallSellerProfileSnapshot.ISummary =
    await api.functional.eCommerceMall.superAdministrator.sellers.profile.snapshots.index(
      adminConnection,
      {
        sellerId,
        body: {
          page: 1,
          limit: 5,
        } satisfies IECommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 5);
  TestValidator.predicate(
    "page 1 records is non-negative",
    () => page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages is non-negative",
    () => page1.pagination.pages >= 0,
  );
  // 4. Test page 2 with limit 5
  const page2: IPageIECommerceMallSellerProfileSnapshot.ISummary =
    await api.functional.eCommerceMall.superAdministrator.sellers.profile.snapshots.index(
      adminConnection,
      {
        sellerId,
        body: {
          page: 2,
          limit: 5,
        } satisfies IECommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 5);
  // 5. Verify no overlapping snapshot IDs between pages (if data exists)
  if (
    page1.pagination.records > 0 &&
    page2.pagination.records > 0 &&
    page1.data.length > 0 &&
    page2.data.length > 0
  ) {
    const page1Ids = new Set(page1.data.map((s) => s.id));
    const page2Ids = new Set(page2.data.map((s) => s.id));
    const overlap = page1.data.filter((s) => page2Ids.has(s.id));
    TestValidator.equals(
      "no overlapping snapshots between pages",
      overlap.length,
      0,
    );
  }
  // 6. Test with limit=100 (maximum)
  const maxLimit: IPageIECommerceMallSellerProfileSnapshot.ISummary =
    await api.functional.eCommerceMall.superAdministrator.sellers.profile.snapshots.index(
      adminConnection,
      {
        sellerId,
        body: {
          page: 1,
          limit: 100,
        } satisfies IECommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(maxLimit);
  TestValidator.equals("max limit value", maxLimit.pagination.limit, 100);
  TestValidator.equals("max limit current", maxLimit.pagination.current, 1);
}
