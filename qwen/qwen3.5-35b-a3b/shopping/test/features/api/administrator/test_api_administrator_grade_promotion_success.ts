import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
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

export async function test_api_administrator_grade_promotion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminJoinConnection: api.IConnection = { host: connection.host };
  const superAdminJoinResponse = await authorize_super_administrator_join(
    superAdminJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(3),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
      },
    },
  );
  typia.assert(superAdminJoinResponse);
  // 2. Create regular administrator account to be promoted
  const regularAdminJoinConnection: api.IConnection = { host: connection.host };
  const regularAdminJoinResponse = await authorize_administrator_join(
    regularAdminJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(2),
        password: RandomGenerator.alphaNumeric(12),
        grade: "regular",
      },
    },
  );
  typia.assert(regularAdminJoinResponse);
  const regularAdminId: string = regularAdminJoinResponse.id;
  const regularAdminPassword: string = regularAdminJoinResponse.token.access; // store password for re-login
  const initialGrade = regularAdminJoinResponse.grade satisfies "regular" | "super";
  TestValidator.equals("initial grade is regular", initialGrade, "regular");
  // 3. Promote regular administrator to super (super admin must be authenticated)
  const promoteConnection: api.IConnection = { host: connection.host };
  const promotionResponse =
    await api.functional.ecommerceMall.superAdministrator.administrators.grades.action(
      promoteConnection,
      {
        administratorId: regularAdminId,
        body: {
          grade: "super",
        } satisfies IEcommerceMallAdministrator.IUpdate,
      },
    );
  typia.assert(promotionResponse);
  // 4. Verify grade change takes effect immediately in response
  TestValidator.equals(
    "grade updated to super",
    promotionResponse.grade,
    "super",
  );
  // 5. Verify updated_at timestamp exists (audit record creation)
  TestValidator.predicate(
    "updated_at timestamp exists",
    promotionResponse.updated_at !== undefined,
  );
  // 6. Verify the promoted administrator can authenticate and retain super privileges
  const reLoginConnection: api.IConnection = { host: connection.host };
  const reLoginResponse = await authorize_administrator_login(
    reLoginConnection,
    {
      body: {
        email: regularAdminJoinResponse.email,
        password: regularAdminJoinResponse.token.access,
        ip: typia.random<string & tags.Format<"ipv4">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(reLoginResponse);
  TestValidator.equals(
    "grade preserved after login",
    reLoginResponse.grade,
    "super",
  );
  // 7. Verify promoted admin can promote another regular admin (super privileges working)
  const anotherAdminJoinConnection: api.IConnection = { host: connection.host };
  const anotherAdminResponse = await authorize_administrator_join(
    anotherAdminJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(2),
        password: RandomGenerator.alphaNumeric(12),
        grade: "regular",
      },
    },
  );
  typia.assert(anotherAdminResponse);
  // Perform second promotion with the now-super administrator credentials
  const secondPromoteConnection: api.IConnection = { host: connection.host };
  const secondPromotionResponse =
    await api.functional.ecommerceMall.superAdministrator.administrators.grades.action(
      secondPromoteConnection,
      {
        administratorId: anotherAdminResponse.id,
        body: {
          grade: "super",
        } satisfies IEcommerceMallAdministrator.IUpdate,
      },
    );
  typia.assert(secondPromotionResponse);
  TestValidator.equals(
    "second promotion successful",
    secondPromotionResponse.grade,
    "super",
  );
}