import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_mall_platform_administrator_order_items_force_cancel_create } from "../../../generate/generate_random_mall_platform_administrator_order_items_force_cancel_create";
import { prepare_random_mall_platform_order_item } from "../../../prepare/prepare_random_mall_platform_order_item";

export async function test_api_order_item_force_cancel_ineligible_item_rejected(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const targetOrderItem =
    await generate_random_mall_platform_administrator_order_items_force_cancel_create(
      adminConnection,
      {
        params: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IMallPlatformOrderItem.ICreate,
      },
    );
  typia.assert(targetOrderItem);
  const beforeStatus = targetOrderItem.status;
  const beforeUpdatedAt = targetOrderItem.updated_at;
  const beforeDeletedAt = targetOrderItem.deleted_at;
  const beforeOrder = targetOrderItem.order;
  const beforeVariant = targetOrderItem.productVariant;
  const beforeSeller = targetOrderItem.seller;
  await TestValidator.error(
    "force-cancel should reject an ineligible order item",
    async () => {
      await generate_random_mall_platform_administrator_order_items_force_cancel_create(
        adminConnection,
        {
          params: {
            orderItemId: targetOrderItem.id,
          },
          body: {
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
          } satisfies IMallPlatformOrderItem.ICreate,
        },
      );
    },
  );
  TestValidator.equals(
    "order item status remains unchanged",
    targetOrderItem.status,
    beforeStatus,
  );
  TestValidator.equals(
    "order item updated_at remains unchanged",
    targetOrderItem.updated_at,
    beforeUpdatedAt,
  );
  TestValidator.equals(
    "order item deleted_at remains unchanged",
    targetOrderItem.deleted_at,
    beforeDeletedAt,
  );
  TestValidator.equals(
    "parent order remains unchanged",
    targetOrderItem.order,
    beforeOrder,
  );
  TestValidator.equals(
    "variant reference remains unchanged",
    targetOrderItem.productVariant,
    beforeVariant,
  );
  TestValidator.equals(
    "seller reference remains unchanged",
    targetOrderItem.seller,
    beforeSeller,
  );
}
