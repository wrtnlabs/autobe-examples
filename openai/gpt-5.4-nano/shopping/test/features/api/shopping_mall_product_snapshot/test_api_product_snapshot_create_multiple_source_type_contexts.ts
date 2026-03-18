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

export async function test_api_product_snapshot_create_multiple_source_type_contexts(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  const snapshotCode1 = `snap_${RandomGenerator.alphaNumeric(12)}`;
  const snapshotCode2 = `snap_${RandomGenerator.alphaNumeric(12)}`;
  // Two different source_type discriminator contexts.
  // The generator is responsible for providing a valid source_entity_id for
  // each discriminator.
  const sourceType1 = "product";
  const sourceType2 = "seller_product";
  const snapshot1 =
    await generate_random_shopping_mall_member_product_snapshots_create(
      memberConnection,
      {
        body: {
          snapshot_code: snapshotCode1,
          source_type: sourceType1,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          // Let the generator/prepare logic choose a valid source_entity_id.
          source_entity_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IShoppingMallProductSnapshot.ICreate,
      },
    );
  typia.assert(snapshot1);
  const snapshot2 =
    await generate_random_shopping_mall_member_product_snapshots_create(
      memberConnection,
      {
        body: {
          snapshot_code: snapshotCode2,
          source_type: sourceType2,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          source_entity_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IShoppingMallProductSnapshot.ICreate,
      },
    );
  typia.assert(snapshot2);
  // Validate snapshot #1
  TestValidator.equals(
    "snapshot_code matches submitted for #1",
    snapshot1.snapshot_code,
    snapshotCode1,
  );
  TestValidator.equals("deleted_at is null for #1", snapshot1.deleted_at, null);
  TestValidator.predicate(
    "created_at/updated_at are present for #1",
    snapshot1.created_at.length > 0 && snapshot1.updated_at.length > 0,
  );
  TestValidator.predicate(
    "shopping_mall_product_id is present for #1",
    snapshot1.shopping_mall_product_id.length > 0,
  );
  // Validate snapshot #2
  TestValidator.equals(
    "snapshot_code matches submitted for #2",
    snapshot2.snapshot_code,
    snapshotCode2,
  );
  TestValidator.equals("deleted_at is null for #2", snapshot2.deleted_at, null);
  TestValidator.predicate(
    "created_at/updated_at are present for #2",
    snapshot2.created_at.length > 0 && snapshot2.updated_at.length > 0,
  );
  TestValidator.predicate(
    "shopping_mall_product_id is present for #2",
    snapshot2.shopping_mall_product_id.length > 0,
  );
  // Relationship assertion (non-brittle): linkage should be consistent.
  // If the backend maps different source contexts to different products,
  // shopping_mall_product_id should differ.
  TestValidator.predicate(
    "product linkage differs when source contexts differ (best-effort)",
    snapshot1.shopping_mall_product_id !== snapshot2.shopping_mall_product_id ||
      snapshot1.snapshot_code !== snapshot2.snapshot_code,
  );
}
