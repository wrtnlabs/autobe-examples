import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorPasswordReset";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_request_rejection_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(superAdmin);
  // 2. Generate a UUID for a pending administrator request
  const administratorRequestId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the reject endpoint
  const rejectedRequest =
    await api.functional.shoppingMall.administrator.administrator_requests.reject(
      superAdminConnection,
      {
        administratorRequestId,
      },
    );
  typia.assert(rejectedRequest);
  // 4. Validate the response structure and required fields
  TestValidator.equals(
    "status is rejected",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.predicate(
    "reviewed_at is populated",
    rejectedRequest.reviewed_at !== null,
  );
  TestValidator.predicate("reviewer is set", rejectedRequest.reviewer !== null);
  TestValidator.predicate(
    "requester info is preserved",
    rejectedRequest.requester !== null &&
      rejectedRequest.requester !== undefined,
  );
}
