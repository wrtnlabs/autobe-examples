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

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_shopping_mall_super_administrator_administrators_grade_changes_promote } from "../../../generate/generate_random_shopping_mall_super_administrator_administrators_grade_changes_promote";
import { prepare_random_shopping_mall_administrator_grade_change } from "../../../prepare/prepare_random_shopping_mall_administrator_grade_change";

export async function test_api_administrator_grade_change_target_already_superadministrator(
  connection: api.IConnection,
): Promise<void> {
  const superAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  const superAdministrator = await authorize_super_administrator_join(
    superAdministratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(superAdministrator);
  const body = {
    reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAdministratorGradeChange.ICreate;
  const impossibleTargetId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "promotion rejects non-promotable or unknown target administrator",
    [400, 404, 409],
    async () => {
      await generate_random_shopping_mall_super_administrator_administrators_grade_changes_promote(
        superAdministratorConnection,
        {
          params: {
            administratorId: impossibleTargetId,
          },
          body,
        },
      );
    },
  );
  TestValidator.equals(
    "acting super administrator stays active",
    superAdministrator.active,
    true,
  );
}
