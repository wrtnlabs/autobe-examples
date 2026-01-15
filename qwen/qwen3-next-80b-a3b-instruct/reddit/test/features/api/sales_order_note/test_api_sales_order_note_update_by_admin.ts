import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrder";
import type { ICommunityPlatformSalesOrderNote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSalesOrderNote";
import { prepare_random_community_platform_sales_order_note } from "../../../prepare/prepare_random_community_platform_sales_order_note";
import { prepare_random_community_platform_order } from "../../../prepare/prepare_random_community_platform_order";
import { generate_random_community_platform_admin_salesordernotes_create } from "../../../generate/generate_random_community_platform_admin_salesordernotes_create";
import { generate_random_community_platform_member_orders_create } from "../../../generate/generate_random_community_platform_member_orders_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_sales_order_note_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the admin actor
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 1: Admin joins to create an admin account
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/join",
        referrer: "https://example.com",
        ip: null,
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  // Update the admin connection with the token from authentication
  adminConnection.headers = adminAuth.token
    ? { Authorization: `Bearer ${adminAuth.token.access}` }
    : {};
  // Step 2: Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "memberPassword123",
        href: "https://example.com/member/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Update the member connection with the token from authentication
  memberConnection.headers = memberAuth.token
    ? { Authorization: `Bearer ${memberAuth.token.access}` }
    : {};
  // Step 3: Member creates an order (required dependency)
  const order: ICommunityPlatformOrder =
    await generate_random_community_platform_member_orders_create(
      memberConnection,
      {
        body: {
          cartId: typia.random<string & tags.Format<"uuid">>(),
          shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
          billing_address_id: typia.random<string & tags.Format<"uuid">>(),
          delivery_window_id: typia.random<string & tags.Format<"uuid">>(),
          carrier_id: typia.random<string & tags.Format<"uuid">>(),
          shipping_method: RandomGenerator.name(),
          currency_code: "KRW",
        } satisfies ICommunityPlatformOrder.ICreate,
      },
    );
  // Step 4: Admin creates a sales order note
  const initialNote: ICommunityPlatformSalesOrderNote =
    await generate_random_community_platform_admin_salesordernotes_create(
      adminConnection,
      {
        body: {
          order_id: order.id,
          content: "Initial note: Order created by member",
        } satisfies ICommunityPlatformSalesOrderNote.ICreate,
      },
    );
  // Step 5: Admin updates the sales order note
  const updatedNote: ICommunityPlatformSalesOrderNote =
    await api.functional.communityPlatform.admin.salesordernotes.update(
      adminConnection,
      {
        noteId: initialNote.note_id,
        body: {
          note: "Updated note: Order status changed to processing",
        } satisfies ICommunityPlatformSalesOrderNote.IUpdate,
      },
    );
  // Step 6: Validate the updated note has the new content and updated timestamp
  typia.assert(updatedNote);
  // Validate content was updated
  TestValidator.equals(
    "note content should be updated",
    updatedNote.content,
    "Updated note: Order status changed to processing",
  );
  // Validate updated timestamp is after the created timestamp
  TestValidator.predicate(
    "updated timestamp should be after created timestamp",
    Date.parse(updatedNote.updated) > Date.parse(initialNote.created),
  );
  // Validate note_id remains the same
  TestValidator.equals(
    "note_id should remain unchanged",
    updatedNote.note_id,
    initialNote.note_id,
  );
  // Validate created timestamp remains unchanged
  TestValidator.equals(
    "created timestamp should remain unchanged",
    updatedNote.created,
    initialNote.created,
  );
  // Validate updated timestamp is different from initial note's updated
  TestValidator.notEquals(
    "updated timestamp should be different after update",
    updatedNote.updated,
    initialNote.updated,
  );
}
