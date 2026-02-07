import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomyPoliticsBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomyPoliticsBoardAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_administrators_filtered_by_email_partial_match(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const email = RandomGenerator.name() + "-admin@example.com";
  const createdUser = await authorize_admin_join(adminConnection, {
    body: {
      email,
      password: "password123",
    },
  });
  // 2. Authenticate as admin
  const adminConnectionForApi: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnectionForApi, {
    body: {
      email: createdUser.email,
      password: "password123",
    } satisfies IEconomyPoliticsBoardAdmin.ILogin,
  });
  // 3. Query administrators list
  const response: IPageIEconomyPoliticsBoardAdmin.ISummary =
    await api.functional.economyPoliticsBoard.admins.index(
      adminConnectionForApi,
      {
        body: {} satisfies IEconomyPoliticsBoardAdmin.IRequest,
      },
    );
  typia.assert(response);
  // 4. Verify results contain the created user
  const createdUserInResponse = response.data.find(
    (user) => user.email === createdUser.email,
  );
  TestValidator.predicate(
    "Created user found in response",
    !!createdUserInResponse,
  );
}
