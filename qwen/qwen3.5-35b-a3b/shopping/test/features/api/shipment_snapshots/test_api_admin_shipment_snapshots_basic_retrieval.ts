import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallShipmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipmentSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_shipment_snapshots_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // 2. Generate random shipment ID
  const shipmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Fetch shipment snapshots with default pagination (page=1, limit=20)
  const response =
    await api.functional.ecommerceMall.admin.shipments.snapshots.index(
      adminConnection,
      {
        shipmentId,
        body: {},
      },
    );
  typia.assert(response);
  // 4. Validate pagination metadata exists and has correct structure
  typia.assert(response.pagination);
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 5. Validate data array is present
  typia.assert(response.data);
  // 6. Validate each snapshot summary has required structure and fields
  for (const snapshot of response.data) {
    typia.assert(snapshot);
    // Snapshot summary validations via typia.assert already performed above
    // All fields are validated by typia.assert: id, tracking_number, carrier_name,
    // status, estimated_delivery_date (nullable), actual_delivery_date (nullable),
    // ecommerce_mall_shipment_id, created_at
    // Validate snapshot is linked to requested shipment
    TestValidator.equals(
      "snapshot shipment ID matches",
      snapshot.ecommerce_mall_shipment_id,
      shipmentId,
    );
  }
  // 7. Validate sorting is by created_at descending (first item should be most recent)
  if (response.data.length >= 2) {
    TestValidator.predicate(
      "snapshots sorted by created_at descending",
      new Date(response.data[0].created_at) >=
        new Date(response.data[1].created_at),
    );
  }
}
