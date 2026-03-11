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

export async function test_api_admin_role_promotion_by_regular_admin_fails(
  connection: api.IConnection,
): Promise<void> {
  // Create first regular admin (actor)
  const actorConnection: api.IConnection = { host: connection.host };
  const actorAdmin = await authorize_admin_join(actorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(actorAdmin);
  // Create second regular admin (target)
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAdmin = await authorize_admin_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(targetAdmin);
  // Actor attempts to promote target to super admin (should fail)
  await TestValidator.error(
    "regular admin cannot promote to super admin",
    async () => {
      await api.functional.ecommerceMall.admin.admin_roles.update(
        actorConnection,
        {
          adminRoleId: targetAdmin.id,
          body: { grade: "super" } satisfies IEcommerceMallAdminRole.IUpdate,
        },
      );
    },
  );
  // Verify target's grade remains 'regular' by fetching and validating
  const fetchedRole =
    await api.functional.ecommerceMall.admin.admin_roles.update(
      targetConnection,
      {
        adminRoleId: targetAdmin.id,
        body: { grade: "regular" } satisfies IEcommerceMallAdminRole.IUpdate,
      },
    );
  typia.assert(fetchedRole);
  TestValidator.equals("target grade unchanged", fetchedRole.grade, "regular");
}
