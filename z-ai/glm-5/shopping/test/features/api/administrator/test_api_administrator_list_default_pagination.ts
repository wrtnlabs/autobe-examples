import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministrator";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create a regular administrator for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // Create additional administrators to populate the list
  const additionalAdmins = await ArrayUtil.asyncRepeat(3, async () => {
    const newConnection: api.IConnection = { host: connection.host };
    const newAdmin = await authorize_administrator_join(newConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
    typia.assert(newAdmin);
    return newAdmin;
  });
  // Call the administrators list endpoint with default pagination (empty request body)
  const response =
    await api.functional.shoppingMall.administrator.administrators.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination metadata has required fields
  TestValidator.predicate(
    "pagination current page is valid",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has records",
    response.pagination.records >= 4,
  );
  // Validate data array contains expected number of administrators
  TestValidator.predicate(
    "data contains at least 4 administrators",
    response.data.length >= 4,
  );
  // Validate each administrator has valid grade value
  for (const admin of response.data) {
    TestValidator.predicate(
      "administrator grade is valid",
      admin.grade === "regular" || admin.grade === "super",
    );
  }
  // Validate sorting by created_at DESC
  for (let i = 1; i < response.data.length; i++) {
    const prev = new Date(response.data[i - 1].created_at);
    const curr = new Date(response.data[i].created_at);
    TestValidator.predicate(
      "results are sorted by created_at DESC",
      prev >= curr,
    );
  }
  // Validate that created administrators are in the list
  const adminIds = response.data.map((a) => a.id);
  TestValidator.predicate(
    "main administrator is in the list",
    adminIds.includes(adminAuth.id),
  );
  for (const additional of additionalAdmins) {
    TestValidator.predicate(
      "additional administrator is in the list",
      adminIds.includes(additional.id),
    );
  }
}
