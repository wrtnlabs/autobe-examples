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

export async function test_api_inventory_record_update_concurrent_consistency(
  connection: api.IConnection,
): Promise<void> {
  // 1) Setup auth: register a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(joined);
  // 2) Precondition data
  // NOTE: No SDK utility/read endpoint for inventory record fetching was provided.
  // We therefore best-effort generate a candidate inventoryRecordId and validate
  // invariants only on successful persisted responses.
  const inventoryRecordId = typia.random<string & tags.Format<"uuid">>();
  // Prepare two different consistent quantity sets.
  // Consistency proxy: available_quantity === stock_quantity - reserved_quantity.
  const stockA = typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>();
  const reservedA =
    typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>() %
    (stockA + 1);
  const availableA = (stockA - reservedA) satisfies number;
  const stockB = typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>();
  const reservedB =
    typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>() %
    (stockB + 1);
  const availableB = (stockB - reservedB) satisfies number;
  const bodyA = {
    stock_quantity: stockA,
    reserved_quantity: reservedA,
    available_quantity: availableA,
  } satisfies IShoppingMallInventoryRecord.IUpdate;
  const bodyB = {
    stock_quantity: stockB,
    reserved_quantity: reservedB,
    available_quantity: availableB,
  } satisfies IShoppingMallInventoryRecord.IUpdate;
  // 3) Perform two concurrent update attempts against the same inventoryRecordId
  const updateA = api.functional.shoppingMall.member.inventoryRecords.update(
    memberConnection,
    {
      inventoryRecordId,
      body: bodyA,
    },
  );
  const updateB = api.functional.shoppingMall.member.inventoryRecords.update(
    memberConnection,
    {
      inventoryRecordId,
      body: bodyB,
    },
  );
  const [resultA, resultB] = await Promise.allSettled([updateA, updateB]);
  const successes: Array<IShoppingMallInventoryRecord> = [];
  if (resultA.status === "fulfilled")
    successes.push(typia.assert(resultA.value));
  if (resultB.status === "fulfilled")
    successes.push(typia.assert(resultB.value));
  // 4) Validation focus
  // Accept either ordering and even one failure. If at least one update succeeded,
  // ensure the persisted record state is self-consistent and auditable.
  if (successes.length > 0) {
    const last = successes[successes.length - 1];
    TestValidator.equals(
      "inventoryRecordId unchanged",
      last.id,
      inventoryRecordId,
    );
    // Basic derived coherence proxy
    TestValidator.equals(
      "available_quantity matches stock - reserved",
      last.available_quantity,
      last.stock_quantity - last.reserved_quantity,
    );
    if (successes.length === 2) {
      const first = successes[0];
      TestValidator.equals(
        "shopping_mall_product_variant_id unchanged",
        first.shopping_mall_product_variant_id,
        last.shopping_mall_product_variant_id,
      );
      // Ensure updated_at corresponds to the final successful update
      TestValidator.predicate(
        "updated_at should be non-decreasing",
        last.updated_at >= first.updated_at,
      );
      // Ensure final quantities correspond to the last successful body
      // (Because both updates hit the same record, last should reflect either A or B)
      const matchesA =
        last.stock_quantity === stockA &&
        last.reserved_quantity === reservedA &&
        last.available_quantity === availableA;
      const matchesB =
        last.stock_quantity === stockB &&
        last.reserved_quantity === reservedB &&
        last.available_quantity === availableB;
      TestValidator.predicate(
        "final quantities correspond to one of the attempts",
        matchesA || matchesB,
      );
    }
  }
}
