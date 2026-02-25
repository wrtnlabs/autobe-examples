import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderSnapshotCategoryPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotCategoryPerformance";
import type { IEcommerceOrderSnapshotGeographicDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistribution";
import type { IEcommerceOrderSnapshotGeographicDistributionCity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCity";
import type { IEcommerceOrderSnapshotGeographicDistributionCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCountry";
import type { IEcommerceOrderSnapshotGeographicDistributionRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionRegion";
import type { IEcommerceOrderSnapshotGeographicDistributionTopRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionTopRegion";
import type { IEcommerceOrderSnapshotGeographicDistributionUnknown } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionUnknown";
import type { IEcommerceOrderSnapshotHourlyDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotHourlyDistribution";
import type { IEcommerceOrderSnapshotSellerPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotSellerPerformance";
import type { IEcommerceOrderSnapshotStatusDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotStatusDistribution";
import type { IEcommercePaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePaymentTransaction";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePaymentTransaction";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_seller_products_variants_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

/**
 * Test comprehensive payment transaction filtering functionality for a customer's order.
 * Tests various filtering scenarios including payment status, method, amount ranges,
 * date ranges, gateway names, and pagination with proper error handling.
 */
export async function test_api_customer_payments_filter_comprehensive(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup seller account and create test products
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: "https://test.com",
      referrer: "https://test.com",
      ip: "127.0.0.1",
    } satisfies IEcommerceSeller.IJoin,
  });
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 2,
          wordMax: 5,
        }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        base_price: typia.random<number & tags.Minimum<1000>>(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: RandomGenerator.alphaNumeric(8),
          option_values: JSON.stringify({ size: "M", color: "blue" }),
          price_override: null,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 2. Setup customer account and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  // 3. Create order through checkout to generate payment transactions
  const order = await api.functional.ecommerce.customer.checkout.create(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
        customer_id: undefined,
        created_after: null,
        created_before: null,
      } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(order);
  // 4. Test filtering by payment status
  const pendingTransactions =
    await api.functional.ecommerce.customer.orders.payment_transactions.index(
      customerConnection,
      {
        orderId: order.period satisfies string as string & tags.Format<"uuid">,
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IEcommercePaymentTransaction.IRequest,
      },
    );
  typia.assert(pendingTransactions);
  TestValidator.predicate(
    "should return pending transactions array",
    Array.isArray(pendingTransactions.data),
  );
  // 5. Test filtering by payment method
  const creditCardTransactions =
    await api.functional.ecommerce.customer.orders.payment_transactions.index(
      customerConnection,
      {
        orderId: order.period satisfies string as string & tags.Format<"uuid">,
        body: {
          payment_method: "credit_card",
          page: 1,
          limit: 10,
        } satisfies IEcommercePaymentTransaction.IRequest,
      },
    );
  typia.assert(creditCardTransactions);
  // 6. Test amount range filtering
  const minAmount = 10;
  const maxAmount = 1000;
  const amountRangeTransactions =
    await api.functional.ecommerce.customer.orders.payment_transactions.index(
      customerConnection,
      {
        orderId: order.period satisfies string as string & tags.Format<"uuid">,
        body: {
          min_amount: minAmount,
          max_amount: maxAmount,
          page: 1,
          limit: 10,
        } satisfies IEcommercePaymentTransaction.IRequest,
      },
    );
  typia.assert(amountRangeTransactions);
  // 7. Test date range filtering
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const dateRangeTransactions =
    await api.functional.ecommerce.customer.orders.payment_transactions.index(
      customerConnection,
      {
        orderId: order.period satisfies string as string & tags.Format<"uuid">,
        body: {
          created_at_min: yesterday,
          created_at_max: tomorrow,
          page: 1,
          limit: 10,
        } satisfies IEcommercePaymentTransaction.IRequest,
      },
    );
  typia.assert(dateRangeTransactions);
  // 8. Test pagination with different page sizes
  const page1 =
    await api.functional.ecommerce.customer.orders.payment_transactions.index(
      customerConnection,
      {
        orderId: order.period satisfies string as string & tags.Format<"uuid">,
        body: {
          page: 1,
          limit: 5,
        } satisfies IEcommercePaymentTransaction.IRequest,
      },
    );
  typia.assert(page1);
  const page2 =
    await api.functional.ecommerce.customer.orders.payment_transactions.index(
      customerConnection,
      {
        orderId: order.period satisfies string as string & tags.Format<"uuid">,
        body: {
          page: 2,
          limit: 5,
        } satisfies IEcommercePaymentTransaction.IRequest,
      },
    );
  typia.assert(page2);
  // 9. Test access control - customer should not access other orders
  await TestValidator.error(
    "should reject access to other customer's order",
    async () => {
      const otherCustomerConnection: api.IConnection = {
        host: connection.host,
      };
      await authorize_customer_join(otherCustomerConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          display_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
        } satisfies IEcommerceCustomer.IJoin,
      });
      await api.functional.ecommerce.customer.orders.payment_transactions.index(
        otherCustomerConnection,
        {
          orderId: order.period satisfies string as string & tags.Format<"uuid">,
          body: {
            page: 1,
            limit: 10,
          } satisfies IEcommercePaymentTransaction.IRequest,
        },
      );
    },
  );
  // 10. Test error handling for invalid order ID
  await TestValidator.error("should reject invalid order ID", async () => {
    await api.functional.ecommerce.customer.orders.payment_transactions.index(
      customerConnection,
      {
        orderId: "invalid-uuid" as string & tags.Format<"uuid">,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommercePaymentTransaction.IRequest,
      },
    );
  });
  // 11. Validate transaction information structure
  if (pendingTransactions.data.length > 0) {
    const transaction = pendingTransactions.data[0];
    TestValidator.predicate(
      "transaction should have id",
      typeof transaction.id === "string",
    );
    TestValidator.predicate(
      "transaction should have payment method",
      typeof transaction.payment_method === "string",
    );
    TestValidator.predicate(
      "transaction should have amount",
      typeof transaction.amount === "number",
    );
    TestValidator.predicate(
      "transaction should have currency",
      typeof transaction.currency === "string",
    );
    TestValidator.predicate(
      "transaction should have gateway name",
      typeof transaction.gateway_name === "string",
    );
    TestValidator.predicate(
      "transaction should have status",
      typeof transaction.status === "string",
    );
    TestValidator.predicate(
      "transaction should have created_at",
      typeof transaction.created_at === "string",
    );
    if (transaction.completed_at !== null) {
      TestValidator.predicate(
        "completed_at should be string or null",
        typeof transaction.completed_at === "string",
      );
    }
    if (transaction.failed_at !== null) {
      TestValidator.predicate(
        "failed_at should be string or null",
        typeof transaction.failed_at === "string",
      );
    }
  }
  // 12. Test combined filtering
  const combinedFilter =
    await api.functional.ecommerce.customer.orders.payment_transactions.index(
      customerConnection,
      {
        orderId: order.period satisfies string as string & tags.Format<"uuid">,
        body: {
          payment_method: "credit_card",
          status: "completed",
          min_amount: 50,
          max_amount: 500,
          page: 1,
          limit: 10,
        } satisfies IEcommercePaymentTransaction.IRequest,
      },
    );
  typia.assert(combinedFilter);
  TestValidator.predicate(
    "combined filter should return valid response",
    Array.isArray(combinedFilter.data),
  );
}