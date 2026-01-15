import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformOrderNote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderNote";
import { prepare_random_community_platform_order_note } from "../prepare/prepare_random_community_platform_order_note";
export async function generate_random_community_platform_member_orders_notes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformOrderNote.ICreate> | undefined;
    params: {
      orderId: string;
    };
  },
): Promise<ICommunityPlatformOrderNote> {
  const prepared: ICommunityPlatformOrderNote.ICreate =
    prepare_random_community_platform_order_note(props.body);
  return await api.functional.communityPlatform.member.orders.notes.create(
    connection,
    {
      body: prepared,
      orderId: props.params.orderId,
    },
  );
}
