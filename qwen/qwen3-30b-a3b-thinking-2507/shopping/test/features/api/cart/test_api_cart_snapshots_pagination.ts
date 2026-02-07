import * as api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAddress";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCart";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCartSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartSnapshot";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerEmailVerification";
import type { IEcommerceCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerPasswordReset";
import type { IEcommerceCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerSession";
import type { IEcommerceDefaultAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDefaultAddress";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductReview";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import type { IEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCartSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCartSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_customer_carts_create } from "../../../generate/generate_random_ecommerce_customer_carts_create";
import { prepare_random_ecommerce_cart } from "../../../prepare/prepare_random_ecommerce_cart";

export async function test_api_cart_snapshots_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<'email'>>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<'uri'>>(),
      referrer: typia.random<string & tags.Format<'uri'>>(),
      ip: typia.random<string & tags.Format<'ipv4'>>(),
    },
  });
  // 2. Create cart
  const cart = await generate_random_ecommerce_customer_carts_create(customerConnection, { body: {} });
  // 3. Verify pagination for cart snapshots - limit=10, page=1
  const page1 = await api.functional.ecommerce.customer.carts.snapshots.index(
    customerConnection,
    {
      cartId: cart.id,
      body: {
        limit: 10,
        page: 1,
      },
    },
  );
  typia.assert(page1);
  // 4. Verify pagination for cart snapshots - limit=10, page=2
  const page2 = await api.functional.ecommerce.customer.carts.snapshots.index(
    customerConnection,
    {
      cartId: cart.id,
      body: {
        limit: 10,
        page: 2,
      },
    },
  );
  typia.assert(page2);
  // 5. Validate pagination
  TestValidator.equals('page size matches', page1.pagination.limit, 10);
  TestValidator.equals('first page index', page1.pagination.current, 1);
  TestValidator.equals('second page index', page2.pagination.current, 2);
  TestValidator.predicate('more than one page', page1.pagination.pages > 1);
  TestValidator.predicate('page 1 has data', page1.data.length > 0);
  TestValidator.predicate('page 2 has data', page2.data.length > 0);
}