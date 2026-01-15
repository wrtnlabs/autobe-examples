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
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import type { ICommunityPlatformSalesOrderNote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSalesOrderNote";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_sales_order_note } from "../../../prepare/prepare_random_community_platform_sales_order_note";
import { prepare_random_community_platform_order } from "../../../prepare/prepare_random_community_platform_order";
import { prepare_random_community_platform_inventory_suppliers } from "../../../prepare/prepare_random_community_platform_inventory_suppliers";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_salesordernotes_create } from "../../../generate/generate_random_community_platform_member_salesordernotes_create";
import { generate_random_community_platform_member_orders_create } from "../../../generate/generate_random_community_platform_member_orders_create";
import { generate_random_community_platform_admin_inventory_suppliers_create } from "../../../generate/generate_random_community_platform_admin_inventory_suppliers_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_sales_order_note_update_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate as admin to establish required entities
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  adminConnection.headers = admin.token
    ? { Authorization: `Bearer ${admin.token.access}` }
    : {};
  // Create a category for product creation
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph(),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  // Create a product using the category with a valid price
  // Must create prices before creating the product
  const productPrice: ICommunityPlatformProductPrice.ICreate = {
    product_code: RandomGenerator.alphaNumeric(8),
    currency_code: "KRW",
    amount: typia.random<number & tags.Minimum<0>>(),
    effective_from: new Date().toISOString(),
    quantity_min: 1,
  };
  // Cast to any to access the actual identifier property that must exist in the response
  const categoryId = (category as any).id as string;
  const product =
    await generate_random_community_platform_member_products_create(
      adminConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: categoryId,
          prices: [productPrice],
          images: [],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  // Create member A and authenticate
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/member-join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  memberAConnection.headers = memberA.token
    ? { Authorization: `Bearer ${memberA.token.access}` }
    : {};
  // Create member B and authenticate
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/member-join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  memberBConnection.headers = memberB.token
    ? { Authorization: `Bearer ${memberB.token.access}` }
    : {};
  // Member A creates a cart
  const cart =
    await api.functional.communityPlatform.carts.create(memberAConnection);
  typia.assert(cart);
  // Cast to any to access the actual identifier property that must exist in the response
  const cartId = (cart as any).id as string;
  // Member A creates an order with dummy values for unavailable entities
  const order = await api.functional.communityPlatform.member.orders.create(
    memberAConnection,
    {
      body: {
        cartId,
        shipping_address_id: "dummy-address-id", // Addresses cannot be created with current API
        billing_address_id: "dummy-address-id", // Addresses cannot be created with current API
        delivery_window_id: "dummy-window-id", // Delivery windows cannot be created with current API
        carrier_id: "dummy-carrier-id", // Carriers cannot be created with current API
        shipping_method: "Standard Ground",
        currency_code: "KRW",
      } satisfies ICommunityPlatformOrder.ICreate,
    },
  );
  typia.assert(order);
  // Member A creates a sales order note on their order
  const noteA =
    await api.functional.communityPlatform.member.salesordernotes.create(
      memberAConnection,
      {
        body: {
          order_id: order.id,
          content: "This is a note created by member A.",
        } satisfies ICommunityPlatformSalesOrderNote.ICreate,
      },
    );
  typia.assert(noteA);
  const noteId = noteA.note_id;
  // Member B attempts to update the note created by member A - this should fail with 403 Forbidden
  await TestValidator.httpError(
    "member B cannot update note created by member A",
    403,
    async () => {
      await api.functional.communityPlatform.member.salesordernotes.update(
        memberBConnection,
        {
          noteId,
          body: {
            note: "This is an unauthorized update attempt by member B.",
          } satisfies ICommunityPlatformSalesOrderNote.IUpdate,
        },
      );
    },
  );
  // Note: We cannot verify the note content before and after due to lack of get endpoint in API
}
