import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_promote_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as regular administrator (admin who will be promoted)
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminResponse = await authorize_admin_join(
    regularAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(regularAdminResponse);
  const regularAdminId: string & tags.Format<"uuid"> = regularAdminResponse.id;
  // 2. Join as super administrator (admin who will perform promotion)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminResponse = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(superAdminResponse);
  // 3. Promote the regular admin using the promote endpoint
  // The super admin calls the promote endpoint with the regular admin's ID
  const promotionResponse: IEcommerceMallAdmin =
    await api.functional.ecommerceMall.admin.admins.promote(
      superAdminConnection,
      {
        adminId: regularAdminId,
        body: {} satisfies IEcommerceMallAdmin.IPromoteRequest,
      },
    );
  typia.assert(promotionResponse);
  // 4. Verify promotion response
  TestValidator.equals(
    "promoted admin ID matches",
    promotionResponse.id,
    regularAdminId,
  );
  TestValidator.equals(
    "promoted admin email matches",
    promotionResponse.email,
    regularAdminResponse.email,
  );
  TestValidator.notEquals(
    "admin was updated at promotion",
    promotionResponse.updated_at,
    regularAdminResponse.updated_at,
  );
  TestValidator.predicate(
    "admin is not banned",
    promotionResponse.is_banned === false,
  );
}