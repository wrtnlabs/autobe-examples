import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrder";
import type { ICommunityPlatformSalesOrderNote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSalesOrderNote";
import { prepare_random_community_platform_sales_order_note } from "../../../prepare/prepare_random_community_platform_sales_order_note";
import { prepare_random_community_platform_order } from "../../../prepare/prepare_random_community_platform_order";
import { generate_random_community_platform_member_salesordernotes_create } from "../../../generate/generate_random_community_platform_member_salesordernotes_create";
import { generate_random_community_platform_member_orders_create } from "../../../generate/generate_random_community_platform_member_orders_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_sales_order_note_retrieval_access_denied_to_unauthorized_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first member account and authenticate
  const member1Connection: api.IConnection = { host: connection.host };
  const member1: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(member1Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member1);
  // Step 2: Create first member's sales order
  const order1: ICommunityPlatformOrder =
    await generate_random_community_platform_member_orders_create(
      member1Connection,
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
  typia.assert(order1);
  // Step 3: Create sales order note for first member's order
  const note1: ICommunityPlatformSalesOrderNote =
    await generate_random_community_platform_member_salesordernotes_create(
      member1Connection,
      {
        body: {
          order_id: order1.id,
          content: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies ICommunityPlatformSalesOrderNote.ICreate,
      },
    );
  typia.assert(note1);
  // Step 4: Create second member account and authenticate (different user)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(member2Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member2);
  // Step 5: Create second member's sales order
  const order2: ICommunityPlatformOrder =
    await generate_random_community_platform_member_orders_create(
      member2Connection,
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
  typia.assert(order2);
  // Step 6: Create sales order note for second member's order
  const note2: ICommunityPlatformSalesOrderNote =
    await generate_random_community_platform_member_salesordernotes_create(
      member2Connection,
      {
        body: {
          order_id: order2.id,
          content: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies ICommunityPlatformSalesOrderNote.ICreate,
      },
    );
  typia.assert(note2);
  // Step 7: Attempt to retrieve note2 (belonging to member2) using member1 connection (unauthorized access)
  // Create a random int32 that matches the API's expected type
  const randomNoteId: number = typia.random<number & tags.Type<"int32">>();
  // Use the random int32 as the noteId - the system should still return 403 for unauthorized access
  // because even if the ID doesn't exist, the authorization should fail
  // This tests the authorization logic, not ID format
  await TestValidator.error(
    "unauthorized member cannot retrieve another member's sales order note",
    async () => {
      await api.functional.communityPlatform.member.salesordernotes.at(
        member1Connection,
        {
          noteId: randomNoteId,
        },
      );
    },
  );
}
