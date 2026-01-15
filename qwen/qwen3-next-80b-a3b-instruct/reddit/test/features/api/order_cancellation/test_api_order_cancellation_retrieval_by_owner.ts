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
import type { ICommunityPlatformOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderCancellation";
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
export async function test_api_order_cancellation_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create product category using admin connection
  const categoryResult =
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
  // Type assertion to handle schema gap: Suppose real response has id property
  const categoryWithId = categoryResult as ICommunityPlatformProductCategory & {
    id: string;
  };
  const categoryId = categoryWithId.id;
  // Step 3: Create inventory supplier using admin connection
  const supplierResult =
    await generate_random_community_platform_admin_inventory_suppliers_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          contact_email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          supplier_type: "manufacturer",
          address_line_1: RandomGenerator.paragraph(),
          city: RandomGenerator.name(),
          state_province: RandomGenerator.name(),
          country: "US",
          website: typia.random<string & tags.Format<"uri">>(),
          payment_terms: "Net 30",
          credit_limit: 10000,
          delivery_capabilities: ["standard"],
          compliance_certifications: ["iso9001"],
          account_manager_name: RandomGenerator.name(),
          account_manager_email: typia.random<string & tags.Format<"email">>(),
          account_manager_phone: RandomGenerator.mobile(),
          bank_account_details: "1234567890",
          password: RandomGenerator.alphaNumeric(16),
          href: "https://example.com/admin/suppliers/new",
          referrer: "https://example.com",
          postal_code: RandomGenerator.alphaNumeric(6),
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  typia.assert<
    ICommunityPlatformInventorySuppliers & {
      id: string;
    }
  >(supplierResult);
  const supplierId = supplierResult.id;
  // Step 4: Create product using admin connection
  const productResult =
    await generate_random_community_platform_member_products_create(
      adminConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: categoryId,
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(8),
              currency_code: "USD",
              amount: 100,
              effective_from: new Date().toISOString(),
              price_type: "retail",
            },
          ],
          images: [
            {
              productCode: RandomGenerator.alphaNumeric(8),
              name: "Product Image",
              extension: "jpg",
              url: typia.random<string & tags.Format<"uri">>(),
              is_primary: true,
              alt_text: "Product image",
              order: 0,
            },
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert<ICommunityPlatformProduct>(productResult);
  const productId = productResult.id;
  // Step 5: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert<ICommunityPlatformMember.IAuthorized>(memberAuth);
  const memberId = memberAuth.id;
  // Step 6: Create cart using member connection
  const cartResult =
    await api.functional.communityPlatform.carts.create(memberConnection);
  // Type assertion to handle schema gap: Suppose real response has id property
  const cartWithId = cartResult as ICommunityPlatformCart & {
    id: string;
  };
  const cartId = cartWithId.id;
  // Step 7: Create order using member connection
  const orderResult =
    await generate_random_community_platform_member_orders_create(
      memberConnection,
      {
        body: {
          cartId: cartId,
          shipping_address_id: cartId,
          billing_address_id: cartId,
          delivery_window_id: cartId,
          carrier_id: cartId,
          shipping_method: "Standard Ground",
          currency_code: "USD",
        } satisfies ICommunityPlatformOrder.ICreate,
      },
    );
  typia.assert<ICommunityPlatformOrder>(orderResult);
  const orderId = orderResult.id;
  // Step 8: Create cancellation request using member connection
  const cancellationReason = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 12,
  });
  const orderAfterCancellation =
    await api.functional.communityPlatform.member.orders.cancellations.erase(
      memberConnection,
      {
        orderId: orderId,
        body: {
          reason: cancellationReason,
        } satisfies ICommunityPlatformOrder.ICancel,
      },
    );
  typia.assert<ICommunityPlatformOrder>(orderAfterCancellation);
  // Use type assertion to get cancellationId from response
  // This is a workaround for a schema/documentation gap
  const orderWithCancellation =
    orderAfterCancellation as ICommunityPlatformOrder & {
      cancellationId: string;
    };
  const cancellationId = orderWithCancellation.cancellationId;
  // Step 9: Retrieve the cancellation record using member connection
  const cancellationData =
    await api.functional.communityPlatform.member.orders.cancellations.at(
      memberConnection,
      {
        orderId: orderId,
        cancellationId: cancellationId,
      },
    );
  typia.assert<ICommunityPlatformOrderCancellation>(cancellationData);
  // Step 10: Validate cancellation data contains the reason and other expected metadata
  // Since ICommunityPlatformOrderCancellation is {[key: string]: string}, we validate the reason is present
  // The system should store the reason, order_id, and member_id in the cancellation record
  // Use underscore naming based on other DTO conventions
  TestValidator.predicate(
    "cancellation has reason metadata",
    cancellationData["reason"] === cancellationReason,
  );
  // Verify cancellation is linked to correct order
  TestValidator.equals(
    "cancellation linked to correct order",
    cancellationData["order_id"],
    orderId,
  );
  // Verify cancellation is linked to correct member
  TestValidator.equals(
    "cancellation linked to correct member",
    cancellationData["member_id"],
    memberId,
  );
}
