import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_product_variant_snapshots_retrieve_by_id_member_success(
  connection: api.IConnection,
): Promise<void> {
  // NOTE:
  // The surrounding test environment is expected to provide a valid existing
  // product-variant snapshot id via a fixture mechanism.
  const memberConnection: api.IConnection = { host: connection.host };
  // 1) Authenticate as member (join)
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 2) Obtain an existing snapshot id.
  // If your fixture system injects an id, replace this line accordingly.
  const productVariantSnapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3) Retrieve snapshot by id
  const actual =
    await api.functional.shoppingMall.member.productVariantSnapshots.at(
      memberConnection,
      {
        productVariantSnapshotId,
      },
    );
  typia.assert(actual);
  // 4) Validate response content
  TestValidator.equals("snapshot id present", actual.id.length > 0, true);
  TestValidator.equals(
    "shopping_mall_product_variant_id present",
    actual.shopping_mall_product_variant_id.length > 0,
    true,
  );
  TestValidator.predicate("code present", actual.code.length > 0);
  TestValidator.predicate("name present", actual.name.length > 0);
  TestValidator.predicate("price non-negative", actual.price >= 0);
  TestValidator.predicate("currency present", actual.currency.length > 0);
  TestValidator.predicate(
    "is_available is boolean",
    typeof actual.is_available === "boolean",
  );
  TestValidator.predicate(
    "variant_status present",
    actual.variant_status.length > 0,
  );
  TestValidator.predicate(
    "created_at parseable",
    Number.isFinite(Date.parse(actual.created_at)),
  );
  TestValidator.predicate(
    "updated_at parseable",
    Number.isFinite(Date.parse(actual.updated_at)),
  );
  TestValidator.equals("deleted_at is null", actual.deleted_at, null);
}
