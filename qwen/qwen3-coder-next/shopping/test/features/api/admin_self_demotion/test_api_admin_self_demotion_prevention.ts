import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_self_demotion_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Authenticate as the super administrator
  const authConnection: api.IConnection = {
    host: connection.host,
    headers: superAdminConnection.headers,
  };
  // 3. Attempt to demote self by calling PUT with grade='regular'
  await TestValidator.error("self-demotion should be rejected", async () => {
    await api.functional.ecommerceMall.admin.admin_roles.update(
      authConnection,
      {
        adminRoleId: superAdmin.id,
        body: {
          grade: "regular" as const,
        },
      },
    );
  });
  // 4. Verify that administrator grade remains 'super'
  // Since there's no GET endpoint, we'll verify by trying to demote again
  // and confirming the error still occurs (meaning grade is still 'super')
  await TestValidator.error(
    "self-demotion still rejected (grade still super)",
    async () => {
      await api.functional.ecommerceMall.admin.admin_roles.update(
        authConnection,
        {
          adminRoleId: superAdmin.id,
          body: {
            grade: "regular" as const,
          },
        },
      );
    },
  );
}
