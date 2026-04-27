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

export async function test_api_administrator_retrieve_regular_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create Admin A (target regular administrator)
  const adminAConnection: api.IConnection = { host: connection.host };
  const adminA = await authorize_administrator_join(adminAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(adminA);
  // Step 2: Create Admin B (will be promoted to super administrator)
  const adminBConnection: api.IConnection = { host: connection.host };
  const adminB = await authorize_administrator_join(adminBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(adminB);
  // Step 3: Promote Admin B to super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const promotedAdminB = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        administrator_id: adminB.id,
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(promotedAdminB);
  // Step 4: Use Admin B's super admin connection to retrieve Admin A's details
  const retrievedAdmin =
    await api.functional.eCommerceMall.superAdministrator.administrators.at(
      superAdminConnection,
      {
        administratorId: adminA.id,
      },
    );
  typia.assert(retrievedAdmin);
  // Step 5: Validate the response fields
  TestValidator.equals(
    "id matches Admin A's UUID",
    retrievedAdmin.id,
    adminA.id,
  );
  TestValidator.equals(
    "email matches Admin A's email",
    retrievedAdmin.email,
    adminA.email,
  );
  TestValidator.equals("grade is 'regular'", retrievedAdmin.grade, "regular");
  TestValidator.predicate(
    "created_at is non-null timestamp",
    () => retrievedAdmin.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at is non-null timestamp",
    () => retrievedAdmin.updated_at !== null,
  );
  TestValidator.equals("deleted_at is null", retrievedAdmin.deleted_at, null);
}
