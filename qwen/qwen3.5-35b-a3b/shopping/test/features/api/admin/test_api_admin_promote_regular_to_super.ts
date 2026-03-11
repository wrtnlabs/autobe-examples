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

export async function test_api_admin_promote_regular_to_super(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoin: IEcommerceMallAdmin.IAuthorized =
    await authorize_admin_join(superAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallAdmin.IJoin,
    });
  // 2. Setup: Create regular administrator
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminJoin: IEcommerceMallAdmin.IAuthorized =
    await authorize_admin_join(regularAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallAdmin.IJoin,
    });
  // 3. Prepare: Promotion request with reason
  const promoteBody = {
    reason: "Promoting to handle increased administrative responsibilities",
  } satisfies IEcommerceMallAdmin.IPromoteRequest;
  // 4. Execute: Super admin promotes regular admin
  const promotedAdmin: IEcommerceMallAdmin =
    await api.functional.ecommerceMall.admin.admins.promote(
      superAdminConnection,
      {
        adminId: regularAdminJoin.id,
        body: promoteBody,
      },
    );
  typia.assert(promotedAdmin);
  // 5. Validate Response Data
  TestValidator.equals(
    "admin ID preserved",
    promotedAdmin.id,
    regularAdminJoin.id,
  );
  TestValidator.equals(
    "admin email preserved",
    promotedAdmin.email,
    regularAdminJoin.email,
  );
  TestValidator.equals("not banned", promotedAdmin.isBanned, false);
  TestValidator.equals(
    "createdAt preserved",
    promotedAdmin.createdAt,
    regularAdminJoin.createdAt,
  );
  TestValidator.notEquals(
    "updatedAt updated after promotion",
    promotedAdmin.updatedAt,
    regularAdminJoin.createdAt,
  );
  // 6. Validate: Promotion was successful
  TestValidator.predicate(
    "promotion successful",
    promotedAdmin.id === regularAdminJoin.id,
  );
}
