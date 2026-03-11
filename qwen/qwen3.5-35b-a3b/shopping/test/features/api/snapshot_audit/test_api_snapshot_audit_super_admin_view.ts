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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_snapshot_audit_super_admin_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Auth as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Seller creates a product to generate initial snapshot audit
  const productName = RandomGenerator.paragraph({ sentences: 2 });
  const randomCategoryId = typia.random<string & tags.Format<"uuid">>();
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: productName,
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: randomCategoryId,
        is_active: true,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Seller updates the product to trigger a new snapshot audit
  const updatedName = RandomGenerator.paragraph({ sentences: 2 });
  const updatedProduct =
    await api.functional.ecommerceMall.seller.products.update(
      sellerConnection,
      {
        productId: product.id,
        body: {
          name: updatedName,
          base_price: product.base_price + 500,
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // 5. Retrieve the snapshot audit record - use the latest snapshot ID from product
  const latestSnapshot =
    updatedProduct.snapshots[updatedProduct.snapshots.length - 1];
  typia.assert(latestSnapshot);
  // Fetch the snapshot audit by ID (admin can view any audit)
  const adminConnectionForAudit: api.IConnection = { host: connection.host };
  const audit = await api.functional.ecommerceMall.admin.snapshot_audits.at(
    adminConnectionForAudit,
    {
      auditId: latestSnapshot.id,
    },
  );
  typia.assert(audit);
  // 6. Validate recordType matches 'product'
  TestValidator.equals("recordType is product", audit.recordType, "product");
  // 7. Validate recordId matches product ID
  TestValidator.equals("recordId matches product", audit.recordId, product.id);
  // 8. Validate oldValues contains the original product state
  const oldValues = audit.oldValues as {
    name?: string;
    base_price?: string;
  };
  TestValidator.equals(
    "oldValues has original name",
    oldValues?.name,
    productName,
  );
  TestValidator.equals(
    "oldValues has original price",
    oldValues?.base_price,
    product.base_price.toString(),
  );
  // 9. Validate newValues contains the updated product state
  const newValues = audit.newValues as {
    name?: string;
    base_price?: string;
  };
  TestValidator.equals(
    "newValues has updated name",
    newValues?.name,
    updatedProduct.name,
  );
  TestValidator.equals(
    "newValues has updated price",
    newValues?.base_price,
    updatedProduct.base_price.toString(),
  );
  // 10. Validate changedAt timestamp is within reasonable range
  const changedAt = new Date(audit.changedAt);
  const now = new Date();
  const diffMs = Math.abs(now.getTime() - changedAt.getTime());
  const diffMinutes = diffMs / (1000 * 60);
  TestValidator.predicate(
    "changedAt is recent (within 1 hour)",
    diffMinutes < 60,
  );
  // 11. Validate changedBy matches the seller's ID
  TestValidator.equals("changedBy is seller ID", audit.changedBy, seller.id);
}
