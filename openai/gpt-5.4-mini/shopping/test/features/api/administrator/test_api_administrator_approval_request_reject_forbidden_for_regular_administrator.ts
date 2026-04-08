import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_approval_request_reject_forbidden_for_regular_administrator(
  connection: api.IConnection,
): Promise<void> {
  const regularAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  const regularAdministrator = await authorize_administrator_join(
    regularAdministratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(regularAdministrator);
  await TestValidator.httpError(
    "regular administrator cannot reject administrator approval requests",
    403,
    async () => {
      await api.functional.mallPlatform.administrator.administratorApprovalRequests.reject(
        regularAdministratorConnection,
        {
          administratorApprovalRequestId: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      );
    },
  );
}
