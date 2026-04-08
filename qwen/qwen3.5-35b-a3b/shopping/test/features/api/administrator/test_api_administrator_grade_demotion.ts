import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorGrade";
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

export async function test_api_administrator_grade_demotion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create demoter super administrator with tracked credentials
  const demoterEmail = typia.random<string & tags.Format<"email">>();
  const demoterPassword = RandomGenerator.alphaNumeric(16);
  const demoterDisplayName = RandomGenerator.name();
  const demoterConnection: api.IConnection = { host: connection.host };
  const demoterAuth = await authorize_super_administrator_join(
    demoterConnection,
    {
      body: {
        email: demoterEmail,
        display_name: demoterDisplayName,
        password: demoterPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(demoterAuth);
  // 2. Create demotee super administrator with tracked credentials
  const demoteeEmail = typia.random<string & tags.Format<"email">>();
  const demoteePassword = RandomGenerator.alphaNumeric(16);
  const demoteeDisplayName = RandomGenerator.name();
  const demoteeConnection: api.IConnection = { host: connection.host };
  const demoteeAuth = await authorize_super_administrator_join(
    demoteeConnection,
    {
      body: {
        email: demoteeEmail,
        display_name: demoteeDisplayName,
        password: demoteePassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(demoteeAuth);
  // 3. Login as demotee to verify account can authenticate (super grade by default)
  const demoteeLoginConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_login(demoteeLoginConnection, {
    body: {
      email: demoteeEmail,
      password: demoteePassword,
    } satisfies IEcommerceMallSuperAdministrator.ILogin,
  });
  // 4. Login as demoter to perform the grade demotion
  const demoterLoginConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_login(demoterLoginConnection, {
    body: {
      email: demoterEmail,
      password: demoterPassword,
    } satisfies IEcommerceMallSuperAdministrator.ILogin,
  });
  // 5. Demote the demotee from super to regular grade
  const updatedAdmin =
    await api.functional.ecommerceMall.superAdministrator.administrators.grade.update(
      demoterLoginConnection,
      {
        adminId: demoteeAuth.id,
        body: {
          grade: "regular",
          reason: "demotion due to policy violation",
        } satisfies IEcommerceMallAdministratorGrade.IUpdate,
      },
    );
  typia.assert(updatedAdmin);
  // 6. Validate the demotion
  TestValidator.equals("admin grade is regular", updatedAdmin.grade, "regular");
  TestValidator.equals(
    "admin email preserved",
    updatedAdmin.email,
    demoteeEmail,
  );
  TestValidator.equals(
    "admin display name preserved",
    updatedAdmin.display_name,
    demoteeDisplayName,
  );
  TestValidator.predicate("admin is not banned", !updatedAdmin.is_banned);
  // 7. Verify the update timestamp changed
  TestValidator.notEquals(
    "update timestamp changed",
    updatedAdmin.updated_at,
    demoteeAuth.superAdministrator.updated_at,
  );
  // 8. Verify the created_at timestamp remained unchanged
  TestValidator.equals(
    "create timestamp unchanged",
    updatedAdmin.created_at,
    demoteeAuth.superAdministrator.created_at,
  );
}
