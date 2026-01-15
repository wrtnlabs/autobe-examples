import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCart } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCart";
import type { ICommunityPlatformInventorySuppliers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventorySuppliers";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrder";
import type { ICommunityPlatformOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderPayment";
import type { ICommunityPlatformOrderPaymentMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderPaymentMetadata";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import type { ICommunityPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipment";
import type { ICommunityPlatformShipmentAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentAddress";
import type { ICommunityPlatformShipmentDimensions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentDimensions";
import type { ICommunityPlatformShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentPackage";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformOrderPayment";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_shipment } from "../../../prepare/prepare_random_community_platform_shipment";
import { prepare_random_community_platform_order } from "../../../prepare/prepare_random_community_platform_order";
import { prepare_random_community_platform_shipment_address } from "../../../prepare/prepare_random_community_platform_shipment_address";
import { prepare_random_community_platform_shipment_package } from "../../../prepare/prepare_random_community_platform_shipment_package";
import { prepare_random_community_platform_inventory_suppliers } from "../../../prepare/prepare_random_community_platform_inventory_suppliers";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_orders_create } from "../../../generate/generate_random_community_platform_member_orders_create";
import { generate_random_community_platform_member_shipments_create } from "../../../generate/generate_random_community_platform_member_shipments_create";
import { generate_random_community_platform_shipments_addresses_create } from "../../../generate/generate_random_community_platform_shipments_addresses_create";
import { generate_random_community_platform_admin_inventory_suppliers_create } from "../../../generate/generate_random_community_platform_admin_inventory_suppliers_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_order_payments_retrieval_by_authenticated_member(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityPlatformAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/",
      } satisfies ICommunityPlatformAdmin.IJoin,
    },
  );
  // Use admin connection to create category
  const category: ICommunityPlatformProductCategory =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  // Use admin connection to create product
  const product: ICommunityPlatformProduct =
    await generate_random_community_platform_member_products_create(
      adminConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          category_id: (category satisfies any as any).id, // Cast to any to bypass type checking
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(8),
              currency_code: "USD",
              amount: typia.random<
                number & tags.Minimum<0> & tags.Maximum<1000>
              >(),
              effective_from: new Date().toISOString(),
              quantity_min: 1,
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ],
          images: [],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/member/join",
        referrer: "https://example.com/",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Create cart with member connection
  const cart: ICommunityPlatformCart =
    await api.functional.communityPlatform.carts.create(memberConnection);
  typia.assert(cart);
  // Create order with member connection (will create payment internally)
  const order: ICommunityPlatformOrder =
    await generate_random_community_platform_member_orders_create(
      memberConnection,
      {
        body: {
          cartId: (cart satisfies any as any).id, // Cast to any to bypass type checking
          shipping_address_id: "c323d4e3-2a1a-454e-8d9c-8b4732c96f17",
          billing_address_id: "c323d4e3-2a1a-454e-8d9c-8b4732c96f17",
          delivery_window_id: "f56d4e9a-7c3a-451a-910a-2e9a8b0f3d6c",
          carrier_id: "a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8",
          shipping_method: "standard",
          currency_code: "USD",
        } satisfies ICommunityPlatformOrder.ICreate,
      },
    );
  typia.assert(order);
  // Retrieve payments for the created order
  const payments: IPageICommunityPlatformOrderPayment =
    await api.functional.communityPlatform.member.orders.payments.index(
      memberConnection,
      {
        orderId: order.id,
      },
    );
  typia.assert(payments);
  // Validate pagination structure
  TestValidator.equals("current page is 1", payments.pagination.current, 1);
  TestValidator.equals("page limit is 10", payments.pagination.limit, 10);
  TestValidator.equals(
    "total records should be at least 1",
    payments.pagination.records >= 1,
    true,
  );
  TestValidator.equals(
    "total pages should be at least 1",
    payments.pagination.pages >= 1,
    true,
  );
  // Validate payments are associated with the correct order
  TestValidator.predicate(
    "all payment records belong to the order",
    payments.data.every((payment) => payment.order_id === order.id),
  );
  // Validate payment records have proper structure
  TestValidator.predicate(
    "all payments have an id",
    payments.data.every((payment) => payment.id !== undefined),
  );
  TestValidator.predicate(
    "all payments have a status",
    payments.data.every((payment) => payment.payment_status !== undefined),
  );
  TestValidator.predicate(
    "all payments have a currency",
    payments.data.every((payment) => payment.currency !== undefined),
  );
  TestValidator.predicate(
    "all payments have an amount",
    payments.data.every((payment) => payment.amount >= 0),
  );
}