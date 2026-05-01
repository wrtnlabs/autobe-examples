import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that a super administrator cannot demote their own account.
 *
 * Validates the platform's self-demotion prevention rule which ensures at
 * least one super administrator always exists on the platform. A super
 * administrator attempts to demote their own account by passing their own
 * administrator ID as the demotion target in the path parameter.
 *
 * The system must reject this request with a 400 Bad Request error
 * indicating that self-demotion is not permitted. Since the operation is
 * rejected, the administrator's grade remains unchanged.
 *
 * 1. Super administrator registers and authenticates via the join endpoint.
 * 2. Super administrator attempts to demote their own account using their
 *    own UUID as the adminId path parameter.
 * 3. Validates that the self-demotion request is rejected with a 400 Bad
 *    Request error.
 */
export async function test_api_admin_demote_self_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a super administrator
  const superConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superConnection, {});
  // 2. Attempt to demote self — must be rejected with 400
  await TestValidator.httpError("self-demotion rejected", 400, async () => {
    await api.functional.shoppingMall.admin.admins.demote(superConnection, {
      adminId: superAdmin.id,
    });
  });
}
