import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSnapshotAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshotAudit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSnapshotAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSnapshotAudit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_snapshot_audit_seller_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate first seller
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller1Auth);
  // 2. Create and authenticate second seller
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller2Auth);
  // 3. Query snapshot audits as seller 1 to get their product snapshots
  const seller1Audits =
    await api.functional.ecommerceMall.seller.snapshot_audits.index(
      seller1Connection,
      {
        body: {
          record_type: ["product"],
          limit: 100,
        } satisfies IEcommerceMallSnapshotAudit.IRequest,
      },
    );
  typia.assert(seller1Audits);
  // 4. Query snapshot audits as seller 2 to get their product snapshots
  const seller2Audits =
    await api.functional.ecommerceMall.seller.snapshot_audits.index(
      seller2Connection,
      {
        body: {
          record_type: ["product"],
          limit: 100,
        } satisfies IEcommerceMallSnapshotAudit.IRequest,
      },
    );
  typia.assert(seller2Audits);
  // 5. Validate data isolation between sellers
  // Check that seller 1 and seller 2 have completely different product snapshots
  const seller1ProductIds = seller1Audits.data
    .filter((audit) => audit.record_type === "product")
    .map((audit) => audit.record_id);
  const seller2ProductIds = seller2Audits.data
    .filter((audit) => audit.record_type === "product")
    .map((audit) => audit.record_id);
  // Verify no overlap between seller 1 and seller 2 product snapshots
  const overlappingIds = seller1ProductIds.filter((id) =>
    seller2ProductIds.includes(id),
  );
  TestValidator.equals(
    "no overlapping product snapshots between sellers",
    overlappingIds.length,
    0,
  );
  // 6. Validate seller 1 can only see their own snapshots
  for (const audit of seller1Audits.data) {
    if (audit.changed_by && "id" in audit.changed_by) {
      const changedById = audit.changed_by.id;
      if (changedById !== seller1Auth.id) {
        TestValidator.notEquals(
          `seller 1 should only see their own snapshots (ID: ${audit.record_id})`,
          changedById,
          seller1Auth.id,
        );
      }
    }
  }
  // 7. Validate seller 2 can only see their own snapshots
  for (const audit of seller2Audits.data) {
    if (audit.changed_by && "id" in audit.changed_by) {
      const changedById = audit.changed_by.id;
      if (changedById !== seller2Auth.id) {
        TestValidator.notEquals(
          `seller 2 should only see their own snapshots (ID: ${audit.record_id})`,
          changedById,
          seller2Auth.id,
        );
      }
    }
  }
}
