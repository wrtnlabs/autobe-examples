import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsUserStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserStatus";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_user_status_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Retrieve user status information for the admin (treating admin as a user)
  const userStatus: ICommunityBbsUserStatus =
    await api.functional.communityBbs.admin.users.status_overview.at(
      adminConnection,
      { userId: admin.id },
    );
  typia.assert(userStatus);
  // Step 4: Validate essential business logic
  TestValidator.equals(
    "status user_id matches created user",
    userStatus.user_id,
    admin.id,
  );
  TestValidator.predicate(
    "status has valid status type",
    [
      "active",
      "suspended",
      "banned",
      "pending_deletion",
      "restricted",
    ].includes(userStatus.status),
  );
  TestValidator.predicate(
    "status has valid actor_type",
    ["admin", "moderator", "guest", "member"].includes(userStatus.actor_type),
  );
}