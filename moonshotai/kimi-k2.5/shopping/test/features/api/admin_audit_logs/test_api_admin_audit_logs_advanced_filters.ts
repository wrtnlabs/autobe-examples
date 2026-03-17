import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminAuditLog";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

export async function test_api_admin_audit_logs_advanced_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 3. Create seller registration
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {},
    );
  typia.assert(registration);
  // 4. Approve seller registration as admin (creates audit log entry)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const registrationId =
    (registration as any).id ?? typia.random<string & tags.Format<"uuid">>();
  const approvedRegistration =
    await api.functional.ecommerceMall.admin.seller_registrations.update(
      adminConnection,
      {
        registrationId: registrationId,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IEcommerceMallSellerRegistration.IUpdate,
      },
    );
  typia.assert(approvedRegistration);
  // 5. Create product as approved seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 6. Delete product as admin (creates audit log entry with action "delete_product")
  await api.functional.ecommerceMall.admin.products.erase(adminConnection, {
    productId: product.id,
  });
  // 7. Query audit logs with specific filters targeting the product deletion
  const auditLogs = await api.functional.ecommerceMall.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        action: "delete_product",
        resourceType: "product",
        createdAtFrom: "2026-03-01T00:00:00Z",
        createdAtTo: "2026-03-31T23:59:59Z",
        sortBy: "created_at",
        sortOrder: "desc",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallAdminAuditLog.IRequest,
    },
  );
  typia.assert(auditLogs);
  // 8. Validate filtering results
  TestValidator.predicate(
    "audit logs should contain entries",
    auditLogs.data.length > 0,
  );
  TestValidator.equals(
    "page should match request",
    auditLogs.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should match request",
    auditLogs.pagination.limit,
    20,
  );
  // Verify the deleted product audit log is present in results
  const deleteProductLog = auditLogs.data.find(
    (log) => log.action === "delete_product" && log.resourceId === product.id,
  );
  TestValidator.predicate(
    "should find delete_product audit log for deleted product",
    !!deleteProductLog,
  );
  // Verify resource type filtering
  const allProductResources = auditLogs.data.every(
    (log) => log.resourceType === "product",
  );
  TestValidator.predicate(
    "all logs should have resourceType 'product'",
    allProductResources,
  );
}
