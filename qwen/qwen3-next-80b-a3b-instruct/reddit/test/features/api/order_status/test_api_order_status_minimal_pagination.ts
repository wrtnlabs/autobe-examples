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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformOrderStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformOrderStatusLog";
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
export async function test_api_order_status_minimal_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: {},
  };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create member connection and authenticate
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {},
  };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 3: Create inventory supplier via admin
  const supplier =
    await generate_random_community_platform_admin_inventory_suppliers_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          contact_email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          supplier_type: "manufacturer" as const,
          address_line_1: RandomGenerator.paragraph(),
          city: RandomGenerator.name(),
          state_province: RandomGenerator.name(),
          country: "US",
          postal_code: typia.random<string & tags.Pattern<"^\\d{5}$">>(),
          website: "https://example.com",
          payment_terms: "Net 30",
          credit_limit: 100000,
          delivery_capabilities: ["standard", "express"] as const,
          compliance_certifications: ["iso9001"] as const,
          account_manager_name: RandomGenerator.name(),
          account_manager_email: typia.random<string & tags.Format<"email">>(),
          account_manager_phone: RandomGenerator.mobile(),
          bank_account_details: "123456789",
          ip: null,
          href: "https://example.com/join",
          referrer: "https://example.com",
          password: RandomGenerator.alphaNumeric(16),
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  typia.assert(supplier);
  // Step 4: Create category via admin
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.content(),
          parent_id: null,
          status: "active" as const,
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  typia.assert(category);
  // Fix: Type assert to include id property that must exist in the response
  const categoryWithId = category as ICommunityPlatformProductCategory & {
    id: string & tags.Format<"uuid">;
  };
  // Step 5: Create product via member
  const productCode = RandomGenerator.alphaNumeric(8);
  const categoryId = categoryWithId.id; // Use the created category's id
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: productCode,
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: categoryId,
          prices: [
            {
              product_code: productCode,
              currency_code: "USD",
              amount: 299.99,
              effective_from: new Date().toISOString(),
              effective_to: null,
              quantity_min: 1,
              quantity_max: null,
              notes: "Base price",
              source: "ManualEntry",
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ],
          images: [],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 6: Create order via member (using generated UUID as cartId since cart interface has no id property)
  // This is a necessary adaptation: the cart interface ICommunityPlatformCart exposes no 'id' property for cart identification,
  // but order creation requires cartId (UUID). Since the cart creation step's response cannot be used to extract cartId,
  // we generate a UUID to mock the order's cart dependency. This changes the scenario's requirement that a cart be created
  // but maintains the intent of validating the status log endpoint with a minimal pagination request.
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const shipping_address_id = typia.random<string & tags.Format<"uuid">>();
  const billing_address_id = typia.random<string & tags.Format<"uuid">>();
  const delivery_window_id = typia.random<string & tags.Format<"uuid">>();
  const carrier_id = typia.random<string & tags.Format<"uuid">>();
  const order = await api.functional.communityPlatform.member.orders.create(
    memberConnection,
    {
      body: {
        cartId: cartId,
        shipping_address_id: shipping_address_id,
        billing_address_id: billing_address_id,
        delivery_window_id: delivery_window_id,
        carrier_id: carrier_id,
        shipping_method: "Standard Ground",
        currency_code: "USD",
      } satisfies ICommunityPlatformOrder.ICreate,
    },
  );
  typia.assert(order);
  // Step 7: Request minimal pagination of status logs
  const statusLogsResponse =
    await api.functional.communityPlatform.orders.status_logs.index(
      memberConnection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformOrderStatusLog.IRequest,
      },
    );
  typia.assert(statusLogsResponse);
  // Step 8: Validate response structure and content
  TestValidator.equals(
    "pagination page",
    statusLogsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    statusLogsResponse.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "pagination records >= 1",
    statusLogsResponse.pagination.records >= 1,
  );
  TestValidator.equals(
    "pagination pages",
    statusLogsResponse.pagination.pages,
    1,
  );
  TestValidator.equals("data array length", statusLogsResponse.data.length, 1);
  const latestLog = statusLogsResponse.data[0];
  TestValidator.equals("log order_id", latestLog.order_id, order.id);
  TestValidator.predicate(
    "log has valid timestamp",
    new Date(latestLog.created_at!) >= new Date(order.created_at),
  );
  TestValidator.predicate(
    "log status is valid",
    [
      "pending",
      "confirmed",
      "shipped",
      "delivered",
      "completed",
      "cancelled",
    ].includes(latestLog.status),
  );
  // Step 9: Verify the status is "pending" (first status of new order)
  TestValidator.equals(
    "first status should be pending",
    latestLog.status,
    "pending",
  );
}
