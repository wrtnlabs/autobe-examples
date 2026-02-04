import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
export async function test_api_superadmin_registration_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Create first superAdmin account with unique email
  const firstEmail = typia.random<string & tags.Format<"email">>();
  const firstSuperAdmin = await authorize_super_admin_join(connection, {
    body: {
      email: firstEmail,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(firstSuperAdmin);
  // Attempt to create duplicate superAdmin account with same email
  await TestValidator.error(
    "duplicate superAdmin email registration should fail",
    async () => {
      await authorize_super_admin_join(connection, {
        body: {
          email: firstEmail, // same email as first creation
          password: RandomGenerator.alphaNumeric(16),
        },
      });
    },
  );
}
