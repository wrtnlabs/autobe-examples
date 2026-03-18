import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_inventory_records_create } from "../../../generate/generate_random_shopping_mall_member_inventory_records_create";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";

export async function test_api_inventory_record_retrieval_unauthorized_other_member(
  connection: api.IConnection,
): Promise<void> {
  // member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  const memberAId = memberA.id;
  TestValidator.predicate("member A has id", memberAId.length > 0);
  const inventoryRecordA =
    await generate_random_shopping_mall_member_inventory_records_create(
      memberAConnection,
      {},
    );
  typia.assert(inventoryRecordA);
  // member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  const memberBId = memberB.id;
  TestValidator.predicate("member B has id", memberBId.length > 0);
  // B must not access A's record
  await TestValidator.httpError(
    "member B cannot retrieve member A inventory record",
    [401, 403, 404],
    async () => {
      await api.functional.shoppingMall.member.inventoryRecords.at(
        memberBConnection,
        { inventoryRecordId: inventoryRecordA.id },
      );
    },
  );
  // Sanity: B can retrieve its own records
  const inventoryRecordB =
    await generate_random_shopping_mall_member_inventory_records_create(
      memberBConnection,
      {},
    );
  typia.assert(inventoryRecordB);
  const retrievedB =
    await api.functional.shoppingMall.member.inventoryRecords.at(
      memberBConnection,
      { inventoryRecordId: inventoryRecordB.id },
    );
  typia.assert(retrievedB);
  TestValidator.equals(
    "retrievedB id matches",
    retrievedB.id,
    inventoryRecordB.id,
  );
  TestValidator.notEquals(
    "B retrieved record is not A's record",
    retrievedB.id,
    inventoryRecordA.id,
  );
}
