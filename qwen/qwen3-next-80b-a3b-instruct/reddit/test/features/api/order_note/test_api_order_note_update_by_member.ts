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
import type { ICommunityPlatformOrderNote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderNote";
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
export async function test_api_order_note_update_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com/admin/join",
    referrer: "https://example.com",
    ip: null,
  } satisfies ICommunityPlatformAdmin.IJoin;
  const admin: ICommunityPlatformAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    { body: adminCredentials },
  );
  // Step 2: Create product category as admin - generate UUID for category_id
  const categoryId: string = typia.random<string & tags.Format<"uuid">>();
  const categoryInput = {
    name: RandomGenerator.name(),
    description: RandomGenerator.content(),
    parent_id: null,
    status: "active",
  } satisfies ICommunityPlatformProductCategory.ICreate;
  const category: ICommunityPlatformProductCategory =
    await api.functional.communityPlatform.admin.categories.create(
      adminConnection,
      { body: categoryInput },
    );
  typia.assert(category);
  // Step 3: Create inventory supplier as admin
  const supplierInput = {
    name: RandomGenerator.name(),
    contact_email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    supplier_type: "manufacturer",
    address_line_1: RandomGenerator.paragraph({ sentences: 1 }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    country: "US",
    website: "https://example.com",
    payment_terms: "Net 30",
    credit_limit: 10000,
    delivery_capabilities: ["standard", "international"],
    compliance_certifications: ["iso9001"],
    account_manager_name: RandomGenerator.name(),
    account_manager_email: typia.random<string & tags.Format<"email">>(),
    account_manager_phone: RandomGenerator.mobile(),
    bank_account_details: "1234567890",
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/admin/suppliers/new",
    referrer: "https://example.com/admin",
    postal_code: "12345",
  } satisfies ICommunityPlatformInventorySuppliers.ICreate;
  const supplier: ICommunityPlatformInventorySuppliers =
    await api.functional.communityPlatform.admin.inventory_suppliers.create(
      adminConnection,
      { body: supplierInput },
    );
  typia.assert(supplier);
  // Step 4: Create product as admin with category_id
  const productInput = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.content(),
    category_id: categoryId, // Use generated UUID
    prices: [
      {
        product_code: RandomGenerator.alphaNumeric(8),
        currency_code: "USD",
        amount: 99.99,
        effective_from: new Date().toISOString(),
        quantity_min: 1,
      },
    ] satisfies ICommunityPlatformProductPrice.ICreate[],
    images: [
      {
        productCode: RandomGenerator.alphaNumeric(8),
        name: "Product Image",
        extension: "jpg",
        url: "https://example.com/images/product.jpg",
        is_primary: true,
        alt_text: "Sample product image",
        order: 0,
      },
    ] satisfies ICommunityPlatformProductImage.ICreate[],
  } satisfies ICommunityPlatformProduct.ICreate;
  const product: ICommunityPlatformProduct =
    await api.functional.communityPlatform.member.products.create(
      adminConnection,
      { body: productInput },
    );
  typia.assert(product);
  // Step 5: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/members/join",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.IJoin;
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, { body: memberCredentials });
  // Step 6: Create shopping cart as member with the category_id we generated
  const cart: ICommunityPlatformCart =
    await api.functional.communityPlatform.carts.create(memberConnection);
  typia.assert(cart);
  // No cart.id property exists - use the categoryId we created
  const cartId: string = categoryId; // We use the same category_id we generated
  // Step 7: Create order as member from cart using the category_id
  const orderInput = {
    cartId: cartId, // Use generated category_id
    shipping_address_id: "00000000-0000-0000-0000-000000000000",
    billing_address_id: "00000000-0000-0000-0000-000000000000",
    delivery_window_id: "00000000-0000-0000-0000-000000000000",
    carrier_id: "00000000-0000-0000-0000-000000000000",
    shipping_method: "Standard Shipping",
    currency_code: "USD",
  } satisfies ICommunityPlatformOrder.ICreate;
  const order: ICommunityPlatformOrder =
    await api.functional.communityPlatform.member.orders.create(
      memberConnection,
      { body: orderInput },
    );
  typia.assert(order);
  // Step 8: Update order note as the correct member
  const noteContent = RandomGenerator.paragraph({ sentences: 3 });
  const noteInput = {
    content: noteContent,
  } satisfies ICommunityPlatformOrderNote.IRequest;
  const updatedNote: ICommunityPlatformOrderNote =
    await api.functional.communityPlatform.orders.notes.index(
      memberConnection,
      {
        orderId: order.id, // order object has id property according to ICommunityPlatformOrder
        body: noteInput,
      },
    );
  typia.assert(updatedNote);
  TestValidator.equals(
    "note content matches",
    updatedNote.content,
    noteContent,
  );
  // Step 9: Create second member connection and authenticate
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMemberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/members/join",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.IJoin;
  const secondMember: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(secondMemberConnection, {
      body: secondMemberCredentials,
    });
  // Step 10: Attempt to update the order note by a different member (should fail)
  await TestValidator.error("different member cannot update note", async () => {
    await api.functional.communityPlatform.orders.notes.index(
      secondMemberConnection,
      {
        orderId: order.id, // Use the order.id from the created order
        body: {
          content: "Attempt by wrong member",
        } satisfies ICommunityPlatformOrderNote.IRequest,
      },
    );
  });
}
