import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_super_admin_shipments_create } from "../../../generate/generate_random_ecommerce_mall_super_admin_shipments_create";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_shipment_items_pagination_cursor(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as superAdmin with dedicated connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  // Step 2: Create a shipment using utility function
  // Note: The generation utility creates the shipment with associated order items
  const shipment =
    await generate_random_ecommerce_mall_super_admin_shipments_create(
      superAdminConnection,
      {
        body: {
          orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
          carrierName: RandomGenerator.alphabets(5),
          trackingNumber: RandomGenerator.alphaNumeric(12),
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // Step 3: First request with default pagination (page-based, not cursor)
  const firstPage =
    await api.functional.ecommerceMall.superAdmin.shipments.items.index(
      superAdminConnection,
      {
        shipmentId: shipment.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(firstPage);
  // Validate pagination structure
  TestValidator.predicate(
    "first page current is 1",
    firstPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "first page limit is 20",
    firstPage.pagination.limit === 20,
  );
  TestValidator.predicate(
    "records is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page data length does not exceed limit",
    firstPage.data.length <= 20,
  );
  TestValidator.predicate(
    "pages calculation is correct",
    firstPage.pagination.pages ===
      Math.ceil(firstPage.pagination.records / firstPage.pagination.limit) ||
      (firstPage.pagination.records === 0 && firstPage.pagination.pages === 0),
  );
  // Step 4: Navigate to next page if multiple pages exist
  if (firstPage.pagination.pages > 1) {
    const secondPage =
      await api.functional.ecommerceMall.superAdmin.shipments.items.index(
        superAdminConnection,
        {
          shipmentId: shipment.id,
          body: {
            page: 2,
            limit: 20,
          } satisfies IEcommerceMallOrderItem.IRequest,
        },
      );
    typia.assert(secondPage);
    TestValidator.predicate(
      "second page current is 2",
      secondPage.pagination.current === 2,
    );
    TestValidator.predicate(
      "second page has same limit",
      secondPage.pagination.limit === 20,
    );
    TestValidator.predicate(
      "second page records match total",
      secondPage.pagination.records === firstPage.pagination.records,
    );
    TestValidator.predicate(
      "second page pages match total",
      secondPage.pagination.pages === firstPage.pagination.pages,
    );
    // Validate items are different between pages
    if (firstPage.data.length > 0 && secondPage.data.length > 0) {
      const firstPageIds = firstPage.data.map((item) => item.id);
      const secondPageIds = secondPage.data.map((item) => item.id);
      const hasOverlap = secondPageIds.some((id) => firstPageIds.includes(id));
      TestValidator.predicate(
        "second page has no overlapping items with first page",
        !hasOverlap,
      );
    }
    // Step 5: Test navigation to page beyond total returns empty results
    const beyondLastPage =
      await api.functional.ecommerceMall.superAdmin.shipments.items.index(
        superAdminConnection,
        {
          shipmentId: shipment.id,
          body: {
            page: firstPage.pagination.pages + 1,
            limit: 20,
          } satisfies IEcommerceMallOrderItem.IRequest,
        },
      );
    typia.assert(beyondLastPage);
    TestValidator.predicate(
      "beyond last page returns empty data array",
      beyondLastPage.data.length === 0,
    );
    TestValidator.predicate(
      "beyond last page preserves pagination total records",
      beyondLastPage.pagination.records === firstPage.pagination.records,
    );
  }
  // Step 6: Test custom limit parameter (boundary test)
  const smallLimitPage =
    await api.functional.ecommerceMall.superAdmin.shipments.items.index(
      superAdminConnection,
      {
        shipmentId: shipment.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(smallLimitPage);
  TestValidator.predicate(
    "small limit page respects limit of 5",
    smallLimitPage.pagination.limit === 5,
  );
  TestValidator.predicate(
    "small limit data does not exceed limit",
    smallLimitPage.data.length <= 5,
  );
  TestValidator.predicate(
    "small limit records match total count",
    smallLimitPage.pagination.records === firstPage.pagination.records,
  );
}
