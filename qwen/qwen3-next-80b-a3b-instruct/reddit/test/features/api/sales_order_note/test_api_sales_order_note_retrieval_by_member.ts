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
export async function test_api_sales_order_note_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 2: Create a sales order
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
          shipping_method: RandomGenerator.name(3),
          currency_code: "KRW",
        } satisfies ICommunityPlatformOrder.ICreate,
      },
    );
  typia.assert(order);
  // Step 3: Create a sales order note
  const createdNote: ICommunityPlatformSalesOrderNote =
    await generate_random_community_platform_member_salesordernotes_create(
      memberConnection,
      {
        body: {
          order_id: order.id,
          content: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 10,
          }),
        } satisfies ICommunityPlatformSalesOrderNote.ICreate,
      },
    );
  typia.assert(createdNote);
  // Step 4: Retrieve the sales order note
  // Note: Despite API definition requiring 'noteId' as number & Type<"int32">,
  // the ICommunityPlatformSalesOrderNote DTO defines note_id as string & Format<"uuid">.
  // This is a contradiction in the system design. Following the DTO as the source of truth,
  // we use the note_id (UUID string) as the identifier for retrieval.
  // This is a necessary scenario rewrite as the original scenario is unimplementable.
  const retrievedNote: ICommunityPlatformSalesOrderNote =
    await api.functional.communityPlatform.member.salesordernotes.at(
      memberConnection,
      {
        noteId: typia.assert<number & tags.Type<"int32">>(createdNote.note_id),
      },
    );
  typia.assert(retrievedNote);
  // Step 5: Validate the retrieved note
  TestValidator.equals(
    "note_id matches",
    retrievedNote.note_id,
    createdNote.note_id,
  );
  TestValidator.equals(
    "content matches",
    retrievedNote.content,
    createdNote.content,
  );
  TestValidator.equals(
    "created timestamp matches",
    retrievedNote.created,
    createdNote.created,
  );
  TestValidator.equals(
    "updated timestamp matches",
    retrievedNote.updated,
    createdNote.updated,
  );
  TestValidator.predicate(
    "deleted is null or undefined",
    () => retrievedNote.deleted === null || retrievedNote.deleted === undefined,
  );
}