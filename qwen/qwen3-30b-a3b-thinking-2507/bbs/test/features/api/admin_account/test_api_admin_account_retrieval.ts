import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_account_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin account using authorization join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<
    string &
      tags.MinLength<8> &
      tags.Pattern<"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$">
  >();
  const newAdmin: IDiscussionBoardAdmin.IAuthorized =
    await authorize_admin_join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(newAdmin);
  // Step 2: Create actor-specific connection for the newly created admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: 'https://example.com',
      referrer: 'https://example.com',
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Step 3: Retrieve the admin account details using the API
  const adminAccount: IDiscussionBoardAdmin =
    await api.functional.discussionBoard.admin.discussion_board.admins.at(
      adminConnection,
      {
        adminId: newAdmin.id,
      },
    );
  typia.assert(adminAccount);
  // Step 4: Validate the retrieved account details
  TestValidator.equals(
    "admin account retrieved successfully",
    newAdmin.id,
    adminAccount.id,
  );
  TestValidator.equals(
    "admin email matches",
    newAdmin.email,
    adminAccount.email,
  );
  // Verify admin account status
  TestValidator.equals(
    "admin status correct",
    newAdmin.status,
    adminAccount.status,
  );
}