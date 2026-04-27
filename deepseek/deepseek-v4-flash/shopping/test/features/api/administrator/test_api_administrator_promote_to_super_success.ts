import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_promote_to_super_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin1 (will be promoted to super admin to act as caller)
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1JoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IECommerceMallAdministrator.IJoin;
  const admin1Authorized = await authorize_administrator_join(
    admin1Connection,
    {
      body: admin1JoinBody,
    },
  );
  typia.assert(admin1Authorized);
  // 2. Promote admin1 to super administrator status (creates the caller)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoinBody = {
    administrator_id: admin1Authorized.id,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IECommerceMallSuperAdministrator.IJoin;
  const superAdminAuthorized = await authorize_super_administrator_join(
    superAdminConnection,
    { body: superAdminJoinBody },
  );
  typia.assert(superAdminAuthorized);
  // 3. Create admin2 (target of the promote operation)
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2JoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IECommerceMallAdministrator.IJoin;
  const admin2Authorized = await authorize_administrator_join(
    admin2Connection,
    {
      body: admin2JoinBody,
    },
  );
  typia.assert(admin2Authorized);
  // 4. Promote admin2 to super administrator via the promote endpoint
  const promoted =
    await api.functional.eCommerceMall.superAdministrator.administrators.promote(
      superAdminConnection,
      {
        administratorId: admin2Authorized.id,
      },
    );
  typia.assert(promoted);
  // 5. Validate the promoted super administrator record
  TestValidator.equals(
    "administrator.id matches target",
    promoted.administrator.id,
    admin2Authorized.id,
  );
  TestValidator.equals(
    "administrator.email matches target",
    promoted.administrator.email,
    admin2JoinBody.email,
  );
  TestValidator.equals(
    "grade changed to super",
    promoted.administrator.grade,
    "super",
  );
  TestValidator.predicate("created_at is valid", promoted.created_at !== null);
  TestValidator.predicate("updated_at is valid", promoted.updated_at !== null);
  TestValidator.predicate("deleted_at is null", promoted.deleted_at === null);
  // 6. Verify promoted admin can authenticate as super administrator
  const promotedLoginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_super_administrator_login(
    promotedLoginConnection,
    {
      body: {
        email: admin2JoinBody.email,
        password: admin2JoinBody.password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IECommerceMallSuperAdministrator.ILogin,
    },
  );
  typia.assert(loginResult);
}
