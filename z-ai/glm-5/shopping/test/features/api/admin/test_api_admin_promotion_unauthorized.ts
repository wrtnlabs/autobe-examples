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

export async function test_api_admin_promotion_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Create a regular administrator account
  // New administrators are created with 'regular' grade by default
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(regularAdmin);
  // Verify the admin has 'regular' grade
  TestValidator.equals("regular admin grade", regularAdmin.grade, "regular");
  // Create another admin to be the target of the promotion attempt
  const targetAdminConnection: api.IConnection = { host: connection.host };
  const targetAdmin = await authorize_admin_join(targetAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(targetAdmin);
  // Regular admin attempts to promote another admin
  // This should fail with 403 Forbidden because only super admins can promote
  await TestValidator.httpError(
    "regular admin cannot promote other admins",
    403,
    async () => {
      await api.functional.shoppingMall.admin.admins.promote(
        regularAdminConnection,
        {
          adminId: targetAdmin.id,
          body: {
            reason: "Attempting unauthorized promotion",
          } satisfies IShoppingMallAdmin.IPromote,
        },
      );
    },
  );
}
