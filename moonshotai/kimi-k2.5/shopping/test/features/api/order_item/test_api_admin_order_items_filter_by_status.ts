import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin filtering order items by fulfillment status.
 * 1. Admin authenticates to gain access to order management
 * 2. Filter items by 'paid' status to find orders awaiting shipment
 * 3. Filter items by 'shipped' status to track in-transit deliveries
 * 4. Verify response validates correctly with typia
 */
export async function test_api_admin_order_items_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection for authentication isolation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Filter by 'paid' status - orders awaiting shipment
  const paidItems = await api.functional.ecommerceMall.admin.items.index(
    adminConnection,
    {
      body: {
        status: "paid",
        page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IEcommerceMallOrderItem.IRequest,
    },
  );
  typia.assert(paidItems);
  // 3. Filter by 'shipped' status - in-transit deliveries
  const shippedItems = await api.functional.ecommerceMall.admin.items.index(
    adminConnection,
    {
      body: {
        status: "shipped",
        page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IEcommerceMallOrderItem.IRequest,
    },
  );
  typia.assert(shippedItems);
  // 4. Filter by 'delivered' status to verify variety
  const deliveredItems = await api.functional.ecommerceMall.admin.items.index(
    adminConnection,
    {
      body: {
        status: "delivered",
        page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IEcommerceMallOrderItem.IRequest,
    },
  );
  typia.assert(deliveredItems);
  // 5. Test filtering with pagination parameters
  const paginatedItems = await api.functional.ecommerceMall.admin.items.index(
    adminConnection,
    {
      body: {
        status: "paid",
        page: 1,
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<20>
        >(),
      } satisfies IEcommerceMallOrderItem.IRequest,
    },
  );
  typia.assert(paginatedItems);
}
