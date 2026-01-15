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
import type { ICommunityPlatformOrderNote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderNote";
import { prepare_random_community_platform_order } from "../../../prepare/prepare_random_community_platform_order";
import { prepare_random_community_platform_order_note } from "../../../prepare/prepare_random_community_platform_order_note";
import { generate_random_community_platform_member_orders_create } from "../../../generate/generate_random_community_platform_member_orders_create";
import { generate_random_community_platform_admin_orders_notes_create } from "../../../generate/generate_random_community_platform_admin_orders_notes_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_order_note_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // Step 2: Create an order using member-specific endpoint
  const order = await generate_random_community_platform_member_orders_create(
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
  typia.assert(order);
  // Step 3: Create an admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 4: Create an initial order note as admin
  const initialNoteRaw =
    await generate_random_community_platform_admin_orders_notes_create(
      adminConnection,
      {
        params: {
          orderId: order.id,
        },
        body: {
          content:
            "Initial note: Order created successfully. Awaiting fulfillment.",
          order_id: order.id,
        } satisfies ICommunityPlatformOrderNote.ICreate,
      },
    );
  const initialNote = typia.assert<ICommunityPlatformOrderNote & { id: string; created_at: string; updated_at: string }>(initialNoteRaw);
  // Step 5: Update the order note content
  const updatedNoteRaw =
    await api.functional.communityPlatform.orders.notes.update(
      adminConnection,
      {
        orderId: order.id,
        noteId: initialNote.id,
        body: {
          content:
            "Updated note: Order has been processed and shipped. Tracking number: TRK123456789",
        } satisfies ICommunityPlatformOrderNote.IUpdate,
      },
    );
  const updatedNote = typia.assert<ICommunityPlatformOrderNote & { id: string; created_at: string; updated_at: string }>(updatedNoteRaw);
  // Step 6: Validate that the update was successful
  TestValidator.equals(
    "updated note content matches",
    updatedNote.content,
    "Updated note: Order has been processed and shipped. Tracking number: TRK123456789",
  );
  TestValidator.equals("note ID preserved", updatedNote.id, initialNote.id);
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedNote.updated_at,
    initialNote.updated_at,
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    () => new Date(updatedNote.updated_at) > new Date(initialNote.created_at),
  );
}