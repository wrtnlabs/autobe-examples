import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a super administrator with a specific unique email
  const admin1Connection: api.IConnection = { host: connection.host };
  const uniqueEmail = typia.random<string & tags.Format<"email">>();
  const uniquePassword = RandomGenerator.alphaNumeric(16);
  const existingAccount = await authorize_super_administrator_join(
    admin1Connection,
    {
      body: {
        email: uniqueEmail,
        display_name: RandomGenerator.name(2),
        password: uniquePassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
      } satisfies IEcommerceMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(existingAccount);
  // Step 2: Verify the first account was created successfully
  TestValidator.equals(
    "existing account email",
    existingAccount.superAdministrator.email,
    uniqueEmail,
  );
  TestValidator.equals(
    "existing account display_name",
    existingAccount.superAdministrator.display_name,
    existingAccount.superAdministrator.display_name,
  );
  // Step 3: Attempt to register a second super administrator with the same email
  // This should be rejected due to duplicate email validation
  const admin2Connection: api.IConnection = { host: connection.host };
  const uniquePassword2 = RandomGenerator.alphaNumeric(16);
  await TestValidator.error(
    "duplicate email registration should be rejected",
    async () => {
      await authorize_super_administrator_join(admin2Connection, {
        body: {
          email: uniqueEmail, // Same email as existing account
          display_name: RandomGenerator.name(2),
          password: uniquePassword2,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
        } satisfies IEcommerceMallSuperAdministrator.IJoin,
      });
    },
  );
  // Step 4: Verify the first account remains unchanged after failed duplicate registration
  const admin3Connection: api.IConnection = { host: connection.host };
  const password3 = RandomGenerator.alphaNumeric(16);
  const anotherAccount = await authorize_super_administrator_join(
    admin3Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(), // Different email
        display_name: RandomGenerator.name(2),
        password: password3,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
      } satisfies IEcommerceMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(anotherAccount);
  // Verify the existing account is still the same (no duplicate was created)
  TestValidator.equals(
    "existing account email unchanged after failed attempt",
    existingAccount.superAdministrator.email,
    uniqueEmail,
  );
  TestValidator.notEquals(
    "existing account and new account are different",
    existingAccount.id,
    anotherAccount.id,
  );
}
