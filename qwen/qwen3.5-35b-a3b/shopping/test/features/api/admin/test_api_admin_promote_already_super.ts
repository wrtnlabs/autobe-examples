import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminGradeRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminGradeRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_promote_already_super(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: (typia.random<string & tags.Format<"uri">>()) satisfies string & tags.Format<"uri">,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create regular administrator account
  const regularConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(regularConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: (typia.random<string & tags.Format<"uri">>()) satisfies string & tags.Format<"uri">,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(regularAdmin);
  // 3. Promote regular admin to super admin using super admin connection
  const promotedAdmin =
    await api.functional.ecommerceMall.admin.admin_grades.promote(
      superConnection,
      {
        body: {
          targetAdministratorId: regularAdmin.id,
        } satisfies IEcommerceMallAdminGradeRequest.IPromote,
      },
    );
  typia.assert(promotedAdmin);
  // 4. Attempt to promote the same admin again - should fail with error
  await TestValidator.error("duplicate promotion rejected", async () => {
    await api.functional.ecommerceMall.admin.admin_grades.promote(
      superConnection,
      {
        body: {
          targetAdministratorId: regularAdmin.id,
        } satisfies IEcommerceMallAdminGradeRequest.IPromote,
      },
    );
  });
}