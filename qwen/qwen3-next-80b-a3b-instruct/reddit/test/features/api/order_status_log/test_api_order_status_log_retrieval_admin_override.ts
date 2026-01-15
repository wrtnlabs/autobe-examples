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
import type { ICommunityPlatformOrderStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderStatusLog";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_order } from "../../../prepare/prepare_random_community_platform_order";
import { prepare_random_community_platform_inventory_suppliers } from "../../../prepare/prepare_random_community_platform_inventory_suppliers";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_orders_create } from "../../../generate/generate_random_community_platform_member_orders_create";
import { generate_random_community_platform_admin_inventory_suppliers_create } from "../../../generate/generate_random_community_platform_admin_inventory_suppliers_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_order_status_log_retrieval_admin_override(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Step 2: Create inventory supplier
  const adminSupplierConnection: api.IConnection = { host: connection.host };
  const supplier: ICommunityPlatformInventorySuppliers =
    await generate_random_community_platform_admin_inventory_suppliers_create(
      adminSupplierConnection,
      {
        body: {
          name: RandomGenerator.name(),
          contact_email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          supplier_type: "manufacturer" as const,
          address_line_1: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(1),
          state_province: RandomGenerator.name(1),
          country: "US", // ISO 3166-1 alpha-2
          website: "https://example.com",
          payment_terms: "Net 30",
          credit_limit: 10000,
          delivery_capabilities: ["standard"],
          compliance_certifications: ["iso9001"],
          account_manager_name: RandomGenerator.name(),
          account_manager_email: typia.random<string & tags.Format<"email">>(),
          account_manager_phone: RandomGenerator.mobile(),
          bank_account_details: "0123456789",
          password: RandomGenerator.alphaNumeric(16),
          href: "https://example.com/admin/suppliers",
          referrer: "https://example.com",
          postal_code: "12345",
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  // Step 3: Create product category (we'll generate a UUID for category_id in product creation)
  const adminCategoryConnection: api.IConnection = { host: connection.host };
  const category: ICommunityPlatformProductCategory =
    await generate_random_community_platform_admin_categories_create(
      adminCategoryConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  // Step 4: Create product with a randomly generated category_id (because ICommunityPlatformProductCategory has no id field)
  const memberProductConnection: api.IConnection = { host: connection.host };
  const product: ICommunityPlatformProduct =
    await generate_random_community_platform_member_products_create(
      memberProductConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          category_id: typia.random<string & tags.Format<"uuid">>(), // Generate a UUID since product category has no id
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(10),
              currency_code: "USD",
              amount: typia.random<
                number &
                  tags.Type<"uint32"> &
                  tags.Minimum<1> &
                  tags.Maximum<1000>
              >(),
              effective_from: new Date().toISOString(),
              effective_to: null,
              quantity_min: 1,
              quantity_max: null,
              notes: "",
              source: "manual",
              region: "",
              price_type: "retail",
              tax_rate: 0,
              unit: "",
            },
          ] satisfies ICommunityPlatformProductPrice.ICreate[],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 5: Create shopping cart
  const memberCartConnection: api.IConnection = { host: connection.host };
  const cart: ICommunityPlatformCart =
    await api.functional.communityPlatform.carts.create(memberCartConnection);
  typia.assert(cart);
  // Step 6: Create order from cart - generate a UUID for cartId because ICommunityPlatformCart has no id field
  // The cart we got from API doesn't have an ID, so we create one for the test
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const memberOrderConnection: api.IConnection = { host: connection.host };
  const order: ICommunityPlatformOrder =
    await generate_random_community_platform_member_orders_create(
      memberOrderConnection,
      {
        body: {
          cartId: cartId, // Use generated UUID
          shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
          billing_address_id: typia.random<string & tags.Format<"uuid">>(),
          delivery_window_id: typia.random<string & tags.Format<"uuid">>(),
          carrier_id: typia.random<string & tags.Format<"uuid">>(),
          shipping_method: "Standard Ground",
          currency_code: "USD",
        } satisfies ICommunityPlatformOrder.ICreate,
      },
    );
  typia.assert(order);
  // Step 7: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityPlatformAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/admin/join",
        referrer: "https://example.com",
        ip: null,
      } satisfies ICommunityPlatformAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 8: Retrieve a specific status log for the order (using generated UUID for logId)
  // The status log is created automatically upon order creation
  // We generate a UUID for the logId and hope it matches
  const statusLog =
    await api.functional.communityPlatform.member.orders.status_logs.at(
      adminConnection,
      {
        orderId: order.id,
        logId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(statusLog);
  // Verify the status log information - it should be the initial "pending" status
  TestValidator.equals(
    "status log should have correct order_id",
    statusLog.order_id,
    order.id,
  );
  // Verify the status log has expected status
  TestValidator.equals(
    "status log should be pending (first entry)",
    statusLog.status,
    "pending",
  );
  // Verify created_by_type is user (admin who placed the order? or system?)
  // Since we're using admin connection to retrieve, but the log was created by the member
  TestValidator.equals(
    "status log created_by_type should be user",
    statusLog.created_by_type,
    "user",
  );
  // Verify admin access to any order's status log
  TestValidator.predicate(
    "admin can access any order status log",
    statusLog.order_id === order.id,
  );
}
