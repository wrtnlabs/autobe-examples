import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import type { IShoppingMallOrderHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderHistory";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReturnShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnShipment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";

export async function test_api_payment_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user sign up and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin#1234";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "http://localhost/",
      referrer: "http://localhost/",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 2. Seller user sign up and login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "Seller#1234";
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        store_name: RandomGenerator.name(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "http://localhost/",
      referrer: "http://localhost/",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 3. Create a product by seller
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        brand: RandomGenerator.name(1),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 4. Customer user sign up and login
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "Customer#1234";
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        nickname: RandomGenerator.name(2),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      ip: null,
      href: "http://localhost/",
      referrer: "http://localhost/",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 5. Create an order by customer containing one order item of the product's SKU
  if (
    !product.shopping_mall_product_skus ||
    product.shopping_mall_product_skus.length === 0
  ) {
    throw new Error("Product must have at least one SKU");
  }
  const sku = product.shopping_mall_product_skus[0];

  const orderItem: IShoppingMallOrderItem.ICreate = {
    shopping_mall_product_sku_id: sku.id,
    quantity: 1,
    unit_price: sku.price,
    total_price: sku.price,
  };

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        order_code: RandomGenerator.alphaNumeric(10),
        shipping_address: `${RandomGenerator.name(2)}, ${RandomGenerator.name(3)}, Seoul, South Korea`,
        shopping_mall_order_items: [orderItem],
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 6. Create a payment by customer linked to the order
  const paymentDate = new Date().toISOString();

  const payment: IShoppingMallPayment =
    await api.functional.shoppingMall.customer.payments.createPayment(
      connection,
      {
        body: {
          shopping_mall_order_id: order.id,
          payment_method: "credit_card",
          payment_status: "completed",
          payment_amount: order.total_amount,
          payment_date: paymentDate,
          created_at: paymentDate,
          updated_at: paymentDate,
        } satisfies IShoppingMallPayment.ICreate,
      },
    );
  typia.assert(payment);

  // 7. Admin retrieves the payment info by paymentId
  const paymentReloaded: IShoppingMallPayment =
    await api.functional.shoppingMall.admin.payments.at(connection, {
      paymentId: payment.id,
    });
  typia.assert(paymentReloaded);

  // 8. Validate that the retrieved payment matches created payment
  TestValidator.equals("payment id", paymentReloaded.id, payment.id);
  TestValidator.equals(
    "payment method",
    paymentReloaded.payment_method,
    payment.payment_method,
  );
  TestValidator.equals(
    "payment status",
    paymentReloaded.payment_status,
    payment.payment_status,
  );
  TestValidator.equals(
    "payment amount",
    paymentReloaded.payment_amount,
    payment.payment_amount,
  );
  TestValidator.equals(
    "payment date",
    paymentReloaded.payment_date,
    payment.payment_date,
  );
  TestValidator.equals(
    "payment order id",
    paymentReloaded.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "payment created at",
    paymentReloaded.created_at,
    payment.created_at,
  );
  TestValidator.equals(
    "payment updated at",
    paymentReloaded.updated_at,
    payment.updated_at,
  );
}
