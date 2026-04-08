import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_order_item_detail_own_item_with_snapshot_context(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string,
      password: RandomGenerator.alphabets(12),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const output = await api.functional.mallPlatform.seller.orderItems.at(
    sellerConnection,
    {
      orderItemId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
  TestValidator.predicate(
    "order item quantity is positive",
    output.quantity > 0,
  );
  TestValidator.predicate(
    "order item status is present",
    output.status.length > 0,
  );
  TestValidator.predicate(
    "order summary id is present",
    output.order.id.length > 0,
  );
  TestValidator.predicate(
    "order summary number is present",
    output.order.orderNumber.length > 0,
  );
  TestValidator.predicate(
    "variant summary id is present",
    output.productVariant.id.length > 0,
  );
  TestValidator.predicate(
    "seller summary id is present",
    output.seller.id.length > 0,
  );
  TestValidator.predicate(
    "created_at is a timestamp",
    output.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is a timestamp",
    output.updated_at.length > 0,
  );
  TestValidator.predicate(
    "deleted_at is nullable",
    output.deleted_at === null || output.deleted_at.length > 0,
  );
}
