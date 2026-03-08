import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorSession";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_request_list_regular_admin_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as a regular administrator
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(
    regularAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(authorized);
  // Verify the administrator has 'regular' grade
  TestValidator.equals(
    "administrator grade is regular",
    authorized.grade,
    "regular",
  );
  // 2. Attempt to access administrator requests list (should be denied)
  await TestValidator.httpError(
    "regular administrator denied access to requests list",
    403,
    async () =>
      await api.functional.shoppingMall.administrator.requests.index(
        regularAdminConnection,
        {
          body: {} satisfies IShoppingMallAdministratorSession.IRequest,
        },
      ),
  );
}
