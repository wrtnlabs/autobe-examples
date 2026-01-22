import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListToken";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin user to establish session for profile retrieval
  // Create a dedicated connection for admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Join as admin using utility function which auto-generates random email and password
  // This creates a new admin account and returns authorization token in connection.headers
  const adminAuth: ITodoListAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: "admin-test@example.com",
        password: "SecureP@ssw0rd123",
      } satisfies ITodoListAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Step 2: Retrieve admin profile information after successful authentication
  // The profile endpoint requires authentication and returns minimal public profile data
  const profileData: ITodoListAdmin.ISummary =
    await api.functional.auth.admin.profile(adminConnection);
  typia.assert(profileData);
  // Step 3: Validate that profile response matches registered admin email
  // The profile must return the same email used during registration
  TestValidator.equals(
    "profile email matches registered email",
    profileData.email,
    adminAuth.email,
  );
}
