import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_product_snapshots_create } from "../../../generate/generate_random_shopping_mall_member_product_snapshots_create";
import { prepare_random_shopping_mall_product_snapshot } from "../../../prepare/prepare_random_shopping_mall_product_snapshot";

export async function test_api_product_snapshot_create_immutability_via_duplicate_code(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);
  const snapshotCode = `snap_${RandomGenerator.alphaNumeric(24)}`;
  const sourceEntityId = typia.random<string & tags.Format<"uuid">>();
  const firstReason = RandomGenerator.paragraph({ sentences: 2 });
  const snapshot1: IShoppingMallProductSnapshot =
    await generate_random_shopping_mall_member_product_snapshots_create(
      memberConnection,
      {
        body: {
          snapshot_code: snapshotCode,
          source_type: "product",
          source_entity_id: sourceEntityId,
          reason: firstReason,
        } satisfies IShoppingMallProductSnapshot.ICreate,
      },
    );
  typia.assert(snapshot1);
  const secondReason = RandomGenerator.paragraph({ sentences: 2 });
  await TestValidator.httpError(
    "duplicate snapshot_code should be rejected without overwriting",
    [409, 400],
    async () => {
      await generate_random_shopping_mall_member_product_snapshots_create(
        memberConnection,
        {
          body: {
            snapshot_code: snapshotCode,
            source_type: "product",
            source_entity_id: sourceEntityId,
            reason: secondReason,
          } satisfies IShoppingMallProductSnapshot.ICreate,
        },
      );
    },
  );
  TestValidator.equals(
    "first snapshot_code preserved",
    snapshot1.snapshot_code,
    snapshotCode,
  );
  TestValidator.equals(
    "first snapshot remains active (deleted_at null)",
    snapshot1.deleted_at,
    null,
  );
}
