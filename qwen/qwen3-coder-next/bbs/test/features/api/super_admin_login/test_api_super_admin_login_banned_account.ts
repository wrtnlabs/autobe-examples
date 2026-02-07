import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_login_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for super admin operations
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 1: Create a super admin account using join endpoint
  // Note: The join endpoint DTO is empty {}, so no actual credentials are required
  const joinResponse =
    await api.functional.discussionBoard.auth.super_admin.join(
      adminConnection,
      {
        body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
      },
    );
  typia.assert(joinResponse);
  // Verify the join was successful
  TestValidator.predicate(
    "join should be successful",
    joinResponse !== null && joinResponse.token !== undefined,
  );
  // Step 2: Attempt to login with the super admin credentials
  // Note: The login endpoint also accepts empty DTO, so we generate random login data
  const loginResponse =
    await api.functional.discussionBoard.auth.super_admin.login(
      adminConnection,
      {
        body: typia.random<IDiscussionBoardSuperAdmin.ILogin>(),
      },
    );
  typia.assert(loginResponse);
  // Note: The scenario describes testing banned account login failure,
  // but the provided API doesn't include ban functionality or credential validation.
  // The DTOs for both join and login are empty objects {}, meaning there's no
  // actual authentication happening. This test validates the basic flow that
  // would work if proper credentials were required.
  // Verify the login response structure is valid
  TestValidator.predicate(
    "login response should be valid",
    loginResponse !== null && typeof loginResponse === "object",
  );
}
