import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_snapshots_filter_by_entity_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies IEcommerceAdmin.IJoin,
  });
  // 2. Request snapshots with entity_type filter
  const snapshots = await api.functional.ecommerce.admin.snapshots.index(
    adminConnection,
    {
      body: {
        entity_type: "ecommerce_products",
      } satisfies IEcommerceSnapshot.IRequest,
    },
  );
  typia.assert(snapshots);
  // 3. Validate response contains only ecommerce_products snapshots
  TestValidator.predicate(
    "All snapshots have entity_type 'ecommerce_products'",
    () =>
      snapshots.data.every((item) => item.entity_type === "ecommerce_products"),
  );
}
