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
 * Test the scenario where a regular administrator retrieves their own account information.
 * This validates the authorization rule that regular administrators can only access their own records.
 * The test should verify that self-viewing returns complete profile information including email,
 * role classification, and timestamps. Ensure the response matches the authenticated administrator's
 * identity and excludes sensitive authentication data.
 */
export async function test_api_admin_profile_view_by_self(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create regular administrator account using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(joinResult);
  // 2. Retrieve own profile using the authenticated connection
  const profile = await api.functional.discussionBoard.admins.at(
    adminConnection,
    {
      adminId: joinResult.id,
    },
  );
  typia.assert(profile);
  // 3. Validate response matches authenticated administrator's identity
  TestValidator.equals(
    "id matches authenticated admin",
    profile.id,
    joinResult.id,
  );
  TestValidator.equals("email matches", profile.email, joinResult.email);
  TestValidator.equals(
    "admin grade is regular",
    profile.admin_grade,
    "regular",
  );
  // 4. Validate deleted_at is null for active account
  TestValidator.equals(
    "deleted_at null for active account",
    profile.deleted_at,
    null,
  );
}
