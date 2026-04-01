import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_snapshot_history_access_control(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(admin);
  const inspectableProductId = typia.random<string & tags.Format<"uuid">>();
  const request = {
    page: 1,
    limit: 20,
  } satisfies IMallPlatformProductSnapshot.IRequest;
  const snapshots =
    await api.functional.mallPlatform.administrator.products.snapshots.index(
      adminConnection,
      {
        productId: inspectableProductId,
        body: request,
      },
    );
  typia.assert(snapshots);
  TestValidator.equals(
    "snapshot pagination current page",
    snapshots.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "snapshot pagination limit",
    snapshots.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "snapshot records are non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "snapshot page count is non-negative",
    snapshots.pagination.pages >= 0,
  );
  const forbiddenProductId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "forbidden product snapshot history access",
    [400, 401, 403, 404],
    async () => {
      await api.functional.mallPlatform.administrator.products.snapshots.index(
        adminConnection,
        {
          productId: forbiddenProductId,
          body: request,
        },
      );
    },
  );
}
