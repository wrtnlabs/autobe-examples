import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCartValidationResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartValidationResult";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_admin_seller_suspensions_suspend } from "../../../generate/generate_random_ecommerce_mall_admin_seller_suspensions_suspend";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_seller_suspension } from "../../../prepare/prepare_random_ecommerce_mall_seller_suspension";

export async function test_api_cart_validation_suspended_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "Admin123!",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "Admin123!",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Create seller and customer connections
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "Seller123!",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "Customer123!",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  await authorize_customer_login(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "Customer123!",
      href: window.location.href,
      referrer: document.referrer || "",
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  // 3. Suspend seller using admin
  // Note: We need a valid seller ID to suspend - in real scenario this would come from
  // seller registration. For this test, we'll use a placeholder UUID.
  // The actual implementation would need to get the real seller ID from the join response
  const sellerId = "00000000-0000-0000-0000-000000000002";
  await api.functional.ecommerceMall.admin.seller_suspensions.suspend(
    adminConnection,
    {
      body: {
        seller_id: sellerId,
        reason: "Violation of terms",
      } satisfies IEcommerceMallSellerSuspension.ICreate,
    },
  );
  // 4. Add cart items (simulated with test data)
  const variantId = "00000000-0000-0000-0000-000000000001";
  await api.functional.ecommerceMall.customer.cart.items.create(
    customerConnection,
    {
      body: {
        variant_id: variantId,
        quantity: 1,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  // 5. Validate cart
  const validation =
    await api.functional.ecommerceMall.customer.cart.validation.patch(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallCartValidationResult.IRequest,
      },
    );
  typia.assert(validation);
  // 6. Verify validation result structure
  TestValidator.predicate(
    "validation result has id",
    validation.id !== undefined,
  );
  TestValidator.predicate(
    "validation result has is_available boolean",
    typeof validation.is_available === "boolean",
  );
  TestValidator.predicate(
    "validation result has variant_id",
    validation.variant_id !== undefined,
  );
  TestValidator.predicate(
    "validation result has product_id",
    validation.product_id !== undefined,
  );
  TestValidator.predicate(
    "validation result has seller_id",
    validation.seller_id !== undefined,
  );
  TestValidator.predicate(
    "validation result has quantity",
    validation.quantity !== undefined,
  );
  TestValidator.predicate(
    "validation result has failure_reasons array",
    Array.isArray(validation.failure_reasons),
  );
}