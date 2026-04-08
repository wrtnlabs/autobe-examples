import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_seller_suspension_restore_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Submit admin request to authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Attempt to restore using a non-existent suspensionId
  const nonExistentSuspensionId = "00000000-0000-0000-0000-000000000000";
  // 3. Validate the response returns HTTP 404 error indicating suspension not found
  await TestValidator.httpError(
    "restore non-existent suspension returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.admin.admin.seller_suspensions.restore(
        adminConnection,
        {
          suspensionId: nonExistentSuspensionId as string & tags.Format<"uuid">,
          body: {} satisfies IEcommerceMallSellerSuspension.IRestore,
        },
      );
    },
  );
}
