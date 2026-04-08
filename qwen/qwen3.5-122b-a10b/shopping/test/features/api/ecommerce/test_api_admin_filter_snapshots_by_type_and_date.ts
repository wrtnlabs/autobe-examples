import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSellerSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_filter_snapshots_by_type_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create date range for filtering
  const now = new Date();
  const fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const toDate = now;
  // 3. Submit snapshot search request
  const snapshots = await api.functional.ecommerce.admin.snapshots.index(
    adminConnection,
    {
      body: {
        snapshotType: "seller",
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IEcommerceSellerSnapshot.IRequest,
    },
  );
  typia.assert(snapshots);
  // 4. Validate response structure
  TestValidator.predicate(
    "pagination exists",
    snapshots.pagination !== undefined,
  );
  TestValidator.predicate("data array exists", Array.isArray(snapshots.data));
  // 5. Verify pagination metadata
  TestValidator.predicate(
    "pagination current >= 0",
    snapshots.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    snapshots.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    snapshots.pagination.pages >= 0,
  );
  // 6. Verify all snapshots match the filter criteria
  await ArrayUtil.asyncForEach(snapshots.data, async (snapshot) => {
    typia.assert(snapshot);
    // Verify snapshot has required seller snapshot fields
    TestValidator.predicate("has shop name", snapshot.shop_name.length > 0);
    TestValidator.predicate(
      "has seller reference",
      snapshot.seller !== undefined,
    );
    // Verify date is within range
    const snapshotDate = new Date(snapshot.created_at);
    TestValidator.predicate(
      "created_at >= fromDate",
      snapshotDate.getTime() >= fromDate.getTime(),
    );
    TestValidator.predicate(
      "created_at <= toDate",
      snapshotDate.getTime() <= toDate.getTime(),
    );
  });
}
