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

export async function test_api_product_variant_snapshots_retrieve_by_id_member_not_owner_forbidden(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAAuthorized);
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberBAuthorized);
  // The task input does not provide any endpoint/utility to create an actual
  // product-variant snapshot owned by a seller, therefore we cannot seed a
  // real owner snapshotId. We still validate the core authorization contract:
  // member B must not be able to retrieve a snapshot payload.
  const productVariantSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "member B must not retrieve snapshot payload",
    async () => {
      const output =
        await api.functional.shoppingMall.member.productVariantSnapshots.at(
          memberBConnection,
          { productVariantSnapshotId },
        );
      // If the call succeeds, this would mean authorization leaked.
      // typia.assert would validate the payload type; instead, fail explicitly.
      throw new Error(`unexpected success payload: ${JSON.stringify(output)}`);
    },
  );
}
