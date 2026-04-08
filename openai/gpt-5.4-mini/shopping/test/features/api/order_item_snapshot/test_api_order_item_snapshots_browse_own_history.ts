import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_item_snapshots_browse_own_history(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const output =
    await api.functional.mallPlatform.customer.orderItemSnapshots.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IMallPlatformOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.equals("pagination current page", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 5);
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data is capped by requested limit",
    output.data.length <= 5,
  );
  if (output.data.length === 0) return;
  TestValidator.predicate("results are ordered newest first", () =>
    output.data.every((current, index, array) => {
      if (index === 0) return true;
      return (
        new Date(array[index - 1].snapshotAt).getTime() >=
        new Date(current.snapshotAt).getTime()
      );
    }),
  );
  const snapshot = output.data[0];
  typia.assert(snapshot);
  TestValidator.predicate("snapshot id exists", snapshot.id.length > 0);
  TestValidator.predicate(
    "snapshot timestamp exists",
    snapshot.snapshotAt.length > 0,
  );
  TestValidator.predicate(
    "snapshot reason exists",
    snapshot.snapshotReason.length > 0,
  );
  TestValidator.predicate(
    "snapshot order item status exists",
    snapshot.orderItemStatus.length > 0,
  );
  TestValidator.predicate(
    "snapshot product name exists",
    snapshot.productName.length > 0,
  );
  TestValidator.predicate(
    "snapshot product description exists",
    snapshot.productDescription.length > 0,
  );
  TestValidator.predicate(
    "snapshot product sku exists",
    snapshot.productSku.length > 0,
  );
  TestValidator.predicate(
    "snapshot variant sku code exists",
    snapshot.variantSkuCode.length > 0,
  );
  TestValidator.predicate(
    "snapshot seller shop name exists",
    snapshot.sellerShopName.length > 0,
  );
  TestValidator.predicate(
    "snapshot seller shop description exists",
    snapshot.sellerShopDescription.length > 0,
  );
  TestValidator.predicate(
    "snapshot seller logo url exists",
    snapshot.sellerLogoImageUrl.length > 0,
  );
  TestValidator.predicate(
    "snapshot unit price is non-negative",
    snapshot.unitPrice >= 0,
  );
  TestValidator.predicate(
    "snapshot quantity is positive",
    snapshot.quantity > 0,
  );
  TestValidator.predicate(
    "snapshot line total is non-negative",
    snapshot.lineTotal >= 0,
  );
  TestValidator.equals(
    "snapshot quantity matches order item quantity",
    snapshot.quantity,
    snapshot.orderItem.quantity,
  );
  TestValidator.equals(
    "snapshot order item status matches snapshot status",
    snapshot.orderItem.status,
    snapshot.orderItemStatus,
  );
  TestValidator.predicate(
    "order item id exists",
    snapshot.orderItem.id.length > 0,
  );
  TestValidator.predicate(
    "order item created timestamp exists",
    snapshot.orderItem.created_at.length > 0,
  );
  TestValidator.predicate(
    "order item updated timestamp exists",
    snapshot.orderItem.updated_at.length > 0,
  );
  TestValidator.predicate(
    "order id exists",
    snapshot.orderItem.order.id.length > 0,
  );
  TestValidator.predicate(
    "order number exists",
    snapshot.orderItem.order.orderNumber.length > 0,
  );
  TestValidator.predicate(
    "product variant id exists",
    snapshot.orderItem.productVariant.id.length > 0,
  );
  TestValidator.predicate(
    "variant sku code exists",
    snapshot.orderItem.productVariant.skuCode.length > 0,
  );
  TestValidator.predicate(
    "seller id exists",
    snapshot.orderItem.seller.id.length > 0,
  );
  TestValidator.predicate(
    "seller email exists",
    snapshot.orderItem.seller.email.length > 0,
  );
}
