import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerSuspension";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_seller_suspension_list_reinstated(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 1: Register admin account
  const adminUser = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminUser);
  // Create another connection with admin token
  const adminWithToken: api.IConnection = {
    host: connection.host,
    headers: { authorization: adminUser.token.access },
  };
  // Step 2: Get all seller suspensions with status 'reinstated'
  const result =
    await api.functional.ecommerceMall.admin.seller_suspensions.index(
      adminWithToken,
      {
        body: {
          status: "reinstated" satisfies "reinstated",
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallSellerSuspension.IRequest,
      },
    );
  typia.assert(result);
  // Step 3: Validate response structure
  TestValidator.equals("pagination exists", result.pagination.current, 1);
  TestValidator.predicate(
    "has records or empty array",
    Array.isArray(result.data),
  );
  // Step 4: If data exists, validate each suspension has reinstated_at timestamp
  if (result.data.length > 0) {
    for (const suspension of result.data) {
      TestValidator.predicate(
        "suspension has reinstated_at timestamp",
        suspension.reinstated_at !== null &&
          suspension.reinstated_at !== undefined,
      );
    }
  }
}
