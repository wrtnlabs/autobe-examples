import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an authenticated administrator can retrieve their own profile information.
 * 1. Register a new administrator account via POST /discussionBoard/auth/admin/join
 * 2. Extract the adminId from the authorization response
 * 3. Call GET /discussionBoard/admin/admins/{adminId}
 * 4. Verify the response contains all expected fields
 * 5. Verify the grade is 'regular' for newly registered admins
 * 6. Verify deleted_at is null for active accounts
 * 7. Verify the returned id matches the requested adminId
 */
export async function test_api_admin_retrieve_own_profile(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const authResponse: IDiscussionBoardAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(authResponse);
  // 2. Verify authorization response has expected fields
  TestValidator.equals("admin id exists", authResponse.id !== undefined, true);
  TestValidator.equals("grade is regular", authResponse.grade, "regular");
  TestValidator.predicate(
    "deleted_at is null for new account",
    () => authResponse.deleted_at === null,
  );
  // 3. Retrieve the administrator profile using the adminId
  const profile: IDiscussionBoardAdmin =
    await api.functional.discussionBoard.admin.admins.at(adminConnection, {
      adminId: authResponse.id,
    });
  typia.assert(profile);
  // 4. Verify profile id matches the requested adminId
  TestValidator.equals(
    "id matches requested adminId",
    profile.id,
    authResponse.id,
  );
  // 5. Verify grade is 'regular' for newly registered admin
  TestValidator.equals("grade is regular", profile.grade, "regular");
  // 6. Verify deleted_at is null for active account
  TestValidator.predicate(
    "deleted_at is null for active account",
    () => profile.deleted_at === null,
  );
}
