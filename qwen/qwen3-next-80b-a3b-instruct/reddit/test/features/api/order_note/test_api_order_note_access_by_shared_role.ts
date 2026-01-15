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
import type { ICommunityPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipment";
import type { ICommunityPlatformShipmentAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentAddress";
import type { ICommunityPlatformShipmentDimensions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentDimensions";
import type { ICommunityPlatformShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentPackage";
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
import { generate_random_community_platform_member_orders_shipments_create } from "../../../generate/generate_random_community_platform_member_orders_shipments_create";
import { generate_random_community_platform_member_shipments_create } from "../../../generate/generate_random_community_platform_member_shipments_create";
import { generate_random_community_platform_shipments_addresses_create } from "../../../generate/generate_random_community_platform_shipments_addresses_create";
import { generate_random_community_platform_admin_inventory_suppliers_create } from "../../../generate/generate_random_community_platform_admin_inventory_suppliers_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_order_note_access_by_shared_role(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin user account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create member user account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
      password: memberPassword,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // Step 3: Create another member (unauthorized user)
  const unrelatedConnection: api.IConnection = { host: connection.host };
  const unrelatedMemberPassword = RandomGenerator.alphaNumeric(16);
  const unrelatedMember = await authorize_member_join(unrelatedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
      password: unrelatedMemberPassword,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(unrelatedMember);
  // Step 4: Authenticate as admin
  const adminAuthConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminAuthConnection, {
    body: {
      email: (admin as any).email,
      password: adminPassword,
      href: "https://example.com/login",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Step 5: Authenticate as member
  const memberAuthConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberAuthConnection, {
    body: {
      email: (member as any).email,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  // Step 6: Authenticate as unrelated member
  const unrelatedAuthConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(unrelatedAuthConnection, {
    body: {
      email: (unrelatedMember as any).email,
      password: unrelatedMemberPassword,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  // Step 7: Create order as member
  const order = await generate_random_community_platform_member_orders_create(
    memberAuthConnection,
    {
      body: {
        cartId: RandomGenerator.alphaNumeric(32), // Assume a placeholder cart ID - system-generated
        shipping_address_id: RandomGenerator.alphaNumeric(32), // dummy
        billing_address_id: RandomGenerator.alphaNumeric(32), // dummy
        delivery_window_id: "dw-12345",
        carrier_id: "carrier-123",
        shipping_method: "Standard Ground",
        currency_code: "USD",
      } satisfies ICommunityPlatformOrder.ICreate,
    },
  );
  typia.assert(order);
  // Step 8: As member, try to get order note (assuming noteId = orderId)
  const memberNote = await api.functional.communityPlatform.orders.notes.at(
    memberAuthConnection,
    {
      orderId: order.id,
      noteId: order.id,
    },
  );
  typia.assert(memberNote);
  // Step 9: As admin, try to get order note (assuming noteId = orderId)
  const adminNote = await api.functional.communityPlatform.orders.notes.at(
    adminAuthConnection,
    {
      orderId: order.id,
      noteId: order.id,
    },
  );
  typia.assert(adminNote);
  // Step 10: Validate that both member and admin have access to the same note
  TestValidator.equals(
    "member and admin see same note content",
    memberNote.content,
    adminNote.content,
  );
  // Step 11: As unrelated member, try to get order note - should fail with 403 Forbidden
  await TestValidator.error(
    "unrelated member cannot access order note",
    async () => {
      await api.functional.communityPlatform.orders.notes.at(
        unrelatedAuthConnection,
        {
          orderId: order.id,
          noteId: order.id,
        },
      );
    },
  );
}
