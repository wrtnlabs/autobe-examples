import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_administrator_requests_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup administrator actor connection with valid credentials
  const adminConnection: api.IConnection = { host: connection.host };
  const administratorAuth = await authorize_administrator_join(
    adminConnection,
    {
      body: {
        email: `admin_${RandomGenerator.alphaNumeric(8)}@test.com`,
        password: "securepassword",
      },
    },
  );
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${administratorAuth.token.access}`,
  };
  // 2. Call the administratorRequests index API with empty filter for default pagination
  const response =
    await api.functional.shoppingMall.administrator.administratorRequests.index(
      adminConnection,
      {
        body: {}, // no filters applied
      },
    );
  typia.assert(response);
  // 3. Verify pagination fields are present and have expected defaults
  TestValidator.predicate(
    "pagination.current should be >= 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination.limit should be >= 1",
    response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination.records should be >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages should be >= 0",
    response.pagination.pages >= 0,
  );
  // 4. Validate each administrator request summary item structure
  for (const item of response.data) {
    TestValidator.predicate(
      "each request summary has id",
      typeof item.id === "string" && item.id.length > 0,
    );
    TestValidator.predicate(
      "each request summary has actorType",
      typeof item.actorType === "string" && item.actorType.length > 0,
    );
    TestValidator.predicate(
      "each request summary has reason",
      typeof item.reason === "string",
    );
    TestValidator.predicate(
      "each request summary has status",
      ["pending", "approved", "rejected"].includes(item.status),
    );
    TestValidator.predicate(
      "each request summary has createdAt",
      typeof item.createdAt === "string" && item.createdAt.length > 0,
    );
    TestValidator.predicate(
      "each request summary has updatedAt",
      typeof item.updatedAt === "string" && item.updatedAt.length > 0,
    );
    TestValidator.predicate(
      "each request summary has deletedAt or null",
      item.deletedAt === null ||
        (typeof item.deletedAt === "string" && item.deletedAt.length > 0),
    );
  }
}
