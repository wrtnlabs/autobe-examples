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

export async function test_api_snapshot_audit_seller_own_products(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!@#$",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Get seller ID from authentication response for validation
  const sellerId = sellerAuth.id;
  // 2. Create a product as the authenticated seller
  const category = typia.random<IEcommerceMallCategory.ISummary>();
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: typia.random<string & tags.MinLength<1> & tags.MaxLength<500>>(),
        description: typia.random<string | null | undefined>(),
        base_price: typia.random<number & tags.Minimum<1>>(),
        category_id: category.id,
        is_active: true,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Fetch seller's own product snapshots with record_type filter
  const snapshotsResponse =
    await api.functional.ecommerceMall.seller.snapshot_audits.index(
      sellerConnection,
      {
        body: {
          record_type: ["product"],
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallSnapshotAudit.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    snapshotsResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records matches data length",
    snapshotsResponse.pagination.records,
    snapshotsResponse.data.length,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    () => snapshotsResponse.pagination.pages >= 0,
  );
  // 5. Validate that snapshots contain the created product
  TestValidator.equals("snapshot count", snapshotsResponse.data.length, 1);
  const snapshot = snapshotsResponse.data[0];
  typia.assert(snapshot);
  // 6. Validate snapshot properties
  TestValidator.equals("snapshot record_type", snapshot.record_type, "product");
  TestValidator.equals(
    "snapshot record_id matches product",
    snapshot.record_id,
    product.id,
  );
  TestValidator.predicate("snapshot changed_at is valid date-time", () => {
    const date = new Date(snapshot.changed_at);
    return !isNaN(date.getTime());
  });
  // 7. Validate changed_by field is the seller's summary (seller actor type)
  const changedBy = snapshot.changed_by;
  typia.assert(changedBy);
  // narrow to seller type based on ID match
  TestValidator.equals("snapshot changed_by is seller", changedBy.id, sellerId);
  TestValidator.equals(
    "snapshot changed_by email matches",
    changedBy.email,
    sellerAuth.email,
  );
  TestValidator.equals(
    "snapshot changed_by approval status matches",
    (changedBy as IEcommerceMallSeller.ISummary).approvalStatus,
    sellerAuth.approval_status,
  );
  TestValidator.equals(
    "snapshot changed_by is_suspended matches",
    (changedBy as IEcommerceMallSeller.ISummary).isSuspended,
    sellerAuth.is_suspended,
  );
  TestValidator.equals(
    "snapshot changed_by is_banned matches",
    (changedBy as IEcommerceMallSeller.ISummary).isBanned,
    sellerAuth.is_banned,
  );
}