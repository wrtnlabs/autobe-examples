import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_registration_within_2_seconds(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert<IEconPoliticBoardAdmin.IAuthorized>(admin);
  TestValidator.equals("admin id should be a valid UUID", admin.id, admin.id);
  TestValidator.equals(
    "admin email should be a valid email format",
    admin.email,
    admin.email,
  );
  TestValidator.equals("admin role should be 'admin'", admin.role, "admin");
  TestValidator.equals(
    "admin status should be 'active'",
    admin.status,
    "active",
  );
  TestValidator.equals(
    "admin createdAt should be in ISO date-time format",
    admin.createdAt,
    admin.createdAt,
  );
}
