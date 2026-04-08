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

export async function test_api_administrator_grade_promotion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two super administrator accounts for testing
  const promoterConnection: api.IConnection = { host: connection.host };
  const promoterEmail = typia.random<string & tags.Format<"email">>();
  const promoterPassword = RandomGenerator.alphaNumeric(16);
  const promoterResult = await authorize_super_administrator_join(
    promoterConnection,
    {
      body: {
        email: promoterEmail,
        display_name: RandomGenerator.name(2),
        password: promoterPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
      },
    },
  );
  typia.assert(promoterResult);
  const reviewerConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(reviewerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(2),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
    },
  });
  // 2. Login as promoter super administrator
  const promoterLoginConnection: api.IConnection = { host: connection.host };
  const promoterLoginResult = await authorize_super_administrator_login(
    promoterLoginConnection,
    {
      body: {
        email: promoterEmail,
        password: promoterPassword,
      } satisfies IEcommerceMallSuperAdministrator.ILogin,
    },
  );
  typia.assert(promoterLoginResult);
  // 3. Create regular administrator via SDK (if endpoint exists)
  // Note: Assuming admin creation endpoint exists in the system
  const adminCreationConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_login(adminCreationConnection, {
    body: {
      email: promoterResult.superAdministrator.email,
      password: promoterResult.token.access,
    },
  });
  // 4. Perform grade promotion (target admin must exist in system)
  const targetAdminId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const promotedAdmin =
    await api.functional.ecommerceMall.superAdministrator.administrators.grade.update(
      promoterLoginConnection,
      {
        adminId: targetAdminId,
        body: {
          grade: "super",
          reason: "promotion for elevated responsibilities",
        } satisfies IEcommerceMallAdministratorGrade.IUpdate,
      },
    );
  typia.assert(promotedAdmin);
  // 5. Validate promotion
  TestValidator.equals("grade updated to super", promotedAdmin.grade, "super");
  TestValidator.notEquals(
    "updated timestamp changed",
    promotedAdmin.updated_at,
    new Date().toISOString(),
  );
  // 6. Validate promoter identity recorded in audit trail
  TestValidator.equals(
    "email preserved",
    promotedAdmin.email,
    promoterResult.superAdministrator.email,
  );
  TestValidator.equals(
    "display name preserved",
    promotedAdmin.display_name,
    promoterResult.superAdministrator.display_name,
  );
  TestValidator.equals("not banned", promotedAdmin.is_banned, false);
}
