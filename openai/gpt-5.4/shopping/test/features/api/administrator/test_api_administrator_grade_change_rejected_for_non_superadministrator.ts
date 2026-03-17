import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGradeChange";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
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
import { generate_random_shopping_mall_super_administrator_administrators_grade_changes_promote } from "../../../generate/generate_random_shopping_mall_super_administrator_administrators_grade_changes_promote";
import { prepare_random_shopping_mall_administrator_grade_change } from "../../../prepare/prepare_random_shopping_mall_administrator_grade_change";

export async function test_api_administrator_grade_change_rejected_for_non_superadministrator(
  connection: api.IConnection,
): Promise<void> {
  const superAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  typia.assert(
    await authorize_super_administrator_join(superAdministratorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    }),
  );
  const actingAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  const actingAdministratorJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallAdministrator.IJoin;
  const actingAdministratorAuth = await authorize_administrator_join(
    actingAdministratorConnection,
    {
      body: actingAdministratorJoinBody,
    },
  );
  typia.assert(actingAdministratorAuth);
  const targetAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  const targetAdministratorJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallAdministrator.IJoin;
  const targetAdministratorAuth = await authorize_administrator_join(
    targetAdministratorConnection,
    {
      body: targetAdministratorJoinBody,
    },
  );
  typia.assert(targetAdministratorAuth);
  const actingAdministratorReloginConnection: api.IConnection = {
    host: connection.host,
  };
  typia.assert(
    await authorize_administrator_login(actingAdministratorReloginConnection, {
      body: {
        email: actingAdministratorJoinBody.email,
        password: actingAdministratorJoinBody.password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallAdministrator.ILogin,
    }),
  );
  const promotionBody = {
    reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAdministratorGradeChange.ICreate;
  await TestValidator.httpError(
    "non-super-administrator cannot promote administrator to super administrator",
    [401, 403],
    async () => {
      await generate_random_shopping_mall_super_administrator_administrators_grade_changes_promote(
        actingAdministratorReloginConnection,
        {
          params: {
            administratorId: targetAdministratorAuth.id,
          },
          body: promotionBody,
        },
      );
    },
  );
  const actingAdministratorPostAttemptConnection: api.IConnection = {
    host: connection.host,
  };
  const actingAdministratorPostAttemptAuth =
    await authorize_administrator_login(
      actingAdministratorPostAttemptConnection,
      {
        body: {
          email: actingAdministratorJoinBody.email,
          password: actingAdministratorJoinBody.password,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IShoppingMallAdministrator.ILogin,
      },
    );
  typia.assert(actingAdministratorPostAttemptAuth);
  const targetAdministratorPostAttemptConnection: api.IConnection = {
    host: connection.host,
  };
  const targetAdministratorPostAttemptAuth =
    await authorize_administrator_login(
      targetAdministratorPostAttemptConnection,
      {
        body: {
          email: targetAdministratorJoinBody.email,
          password: targetAdministratorJoinBody.password,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IShoppingMallAdministrator.ILogin,
      },
    );
  typia.assert(targetAdministratorPostAttemptAuth);
  TestValidator.equals(
    "acting administrator identity remains unchanged after rejected promotion",
    actingAdministratorPostAttemptAuth.id,
    actingAdministratorAuth.id,
  );
  TestValidator.equals(
    "acting administrator email remains unchanged after rejected promotion",
    actingAdministratorPostAttemptAuth.email,
    actingAdministratorAuth.email,
  );
  TestValidator.equals(
    "target administrator identity remains unchanged after rejected promotion",
    targetAdministratorPostAttemptAuth.id,
    targetAdministratorAuth.id,
  );
  TestValidator.equals(
    "target administrator email remains unchanged after rejected promotion",
    targetAdministratorPostAttemptAuth.email,
    targetAdministratorAuth.email,
  );
}
