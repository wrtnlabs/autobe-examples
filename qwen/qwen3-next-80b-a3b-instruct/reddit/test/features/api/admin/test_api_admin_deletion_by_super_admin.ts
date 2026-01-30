import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_deletion_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin account using authorize_admin_join
  const newAdminConnection: api.IConnection = { host: connection.host };
  const createdAdmin: ICommunityBbsAdmin.IAuthorized =
    await authorize_admin_join(newAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password12345678",
      } satisfies ICommunityBbsAdmin.IJoin,
    });
  typia.assert(createdAdmin);
  // Step 2: Authenticate as second admin using authorize_admin_join
  const secondAdminConnection: api.IConnection = { host: connection.host };
  const secondAdmin: ICommunityBbsAdmin.IAuthorized =
    await authorize_admin_join(secondAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password12345678",
      } satisfies ICommunityBbsAdmin.IJoin,
    });
  typia.assert(secondAdmin);
  // Step 3: Delete the newly created admin account using the erase function
  await api.functional.communityBbs.admin.admins.erase(secondAdminConnection, {
    adminId: createdAdmin.id,
  });
  // Step 4: Verify that deleting an already-deleted admin fails (double-verify deletion is permanent)
  await TestValidator.error("cannot delete admin twice", async () => {
    await api.functional.communityBbs.admin.admins.erase(
      secondAdminConnection,
      {
        adminId: createdAdmin.id,
      },
    );
  });
}
