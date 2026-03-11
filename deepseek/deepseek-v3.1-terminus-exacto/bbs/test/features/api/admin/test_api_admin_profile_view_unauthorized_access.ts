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

export async function test_api_admin_profile_view_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Create first administrator account
  const admin1JoinConnection: api.IConnection = { host: connection.host };
  const admin1Auth = await authorize_admin_join(admin1JoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin1Auth);
  // Create authenticated connection for first admin
  const admin1Connection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${admin1Auth.token.access}`,
    },
  };
  // Create second administrator account
  const admin2JoinConnection: api.IConnection = { host: connection.host };
  const admin2Auth = await authorize_admin_join(admin2JoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin2Auth);
  // Create authenticated connection for second admin
  const admin2Connection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${admin2Auth.token.access}`,
    },
  };
  // Verify that admin1 can view their own profile
  const ownProfile = await api.functional.discussionBoard.admins.at(
    admin1Connection,
    {
      adminId: admin1Auth.id,
    },
  );
  typia.assert(ownProfile);
  TestValidator.equals(
    "admin can view own profile",
    ownProfile.id,
    admin1Auth.id,
  );
  // Attempt to access second admin's profile using first admin's connection
  // This should fail due to authorization restrictions
  await TestValidator.error(
    "regular admin cannot view another admin's profile",
    async () => {
      await api.functional.discussionBoard.admins.at(admin1Connection, {
        adminId: admin2Auth.id,
      });
    },
  );
  // Verify that admin2 can view their own profile
  const admin2OwnProfile = await api.functional.discussionBoard.admins.at(
    admin2Connection,
    {
      adminId: admin2Auth.id,
    },
  );
  typia.assert(admin2OwnProfile);
  TestValidator.equals(
    "admin2 can view own profile",
    admin2OwnProfile.id,
    admin2Auth.id,
  );
}
