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

export async function test_api_product_snapshot_create_success_and_conflicts(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
    } satisfies IShoppingMallMember.IJoin,
  });
  const snapshotCode = `snap_${RandomGenerator.alphabets(10)}_${Date.now()}`;
  const sourceType = typia.random<string>();
  const sourceEntityId = typia.random<string & tags.Format<"uuid">>();
  const firstReason = RandomGenerator.paragraph({ sentences: 1 });
  const first =
    await generate_random_shopping_mall_member_product_snapshots_create(
      memberConnection,
      {
        body: {
          snapshot_code: snapshotCode,
          source_type: sourceType,
          source_entity_id: sourceEntityId,
          reason: firstReason,
        } satisfies IShoppingMallProductSnapshot.ICreate,
      },
    );
  typia.assert(first);
  TestValidator.equals(
    "snapshot_code matches input",
    first.snapshot_code,
    snapshotCode,
  );
  TestValidator.equals("deleted_at is null", first.deleted_at, null);
  await TestValidator.error("duplicate snapshot_code conflict", async () => {
    await generate_random_shopping_mall_member_product_snapshots_create(
      memberConnection,
      {
        body: {
          snapshot_code: snapshotCode,
          source_type: sourceType,
          source_entity_id: sourceEntityId,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IShoppingMallProductSnapshot.ICreate,
      },
    );
  });
}
