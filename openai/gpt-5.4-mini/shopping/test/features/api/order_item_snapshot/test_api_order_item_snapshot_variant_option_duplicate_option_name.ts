import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import type { IMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshotVariantOption";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_order_item_snapshots_variant_options_create } from "../../../generate/generate_random_mall_platform_customer_order_item_snapshots_variant_options_create";
import { prepare_random_mall_platform_order_item_snapshot_variant_option } from "../../../prepare/prepare_random_mall_platform_order_item_snapshot_variant_option";

/**
 * Tests that duplicate variant option names are rejected for an order item snapshot.
 *
 * This verifies the preserved purchase-history constraint on snapshot option rows by attempting to create a second option entry with the same option name for the same snapshot context. The endpoint must preserve the original row and reject the duplicate as a business conflict.
 *
 * 1. Authenticate a customer through the provided join utility on an isolated connection.
 * 2. Attempt to create a variant option row twice with the same option name for the same order item snapshot context.
 * 3. Confirm the duplicate request fails and that the preserved option row remains unchanged.
 */
export async function test_api_order_item_snapshot_variant_option_duplicate_option_name(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const optionName = "color";
  const firstOptionValue = RandomGenerator.name();
  const duplicateOptionValue = RandomGenerator.name();
  const created =
    await generate_random_mall_platform_customer_order_item_snapshots_variant_options_create(
      customerConnection,
      {
        params: {
          orderItemSnapshotId: snapshotId,
        },
        body: {
          optionName,
          optionValue: firstOptionValue,
        } satisfies IMallPlatformOrderItemSnapshotVariantOption.ICreate,
      },
    );
  typia.assert(created);
  TestValidator.equals("option name preserved", created.optionName, optionName);
  TestValidator.equals(
    "option value preserved",
    created.optionValue,
    firstOptionValue,
  );
  await TestValidator.error(
    "duplicate option name must be rejected",
    async () => {
      await generate_random_mall_platform_customer_order_item_snapshots_variant_options_create(
        customerConnection,
        {
          params: {
            orderItemSnapshotId: snapshotId,
          },
          body: {
            optionName,
            optionValue: duplicateOptionValue,
          } satisfies IMallPlatformOrderItemSnapshotVariantOption.ICreate,
        },
      );
    },
  );
  TestValidator.equals(
    "original option name unchanged",
    created.optionName,
    optionName,
  );
  TestValidator.equals(
    "original option value unchanged",
    created.optionValue,
    firstOptionValue,
  );
}
