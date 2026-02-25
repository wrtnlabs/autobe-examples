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

export async function test_api_administrator_administrator_requests_filter_by_actor_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Define filters for tests
  const actorTypes = ["customer", "seller"] as const;
  const statuses: ("pending" | "approved" | "rejected")[] = [
    "pending",
    "approved",
    "rejected",
  ];
  // 3. Test multiple combinations of actorType and status with pagination
  for (const actorType of actorTypes) {
    for (const status of statuses) {
      // Use page 1, limit 5 for testing pagination
      const body: IShoppingMallAdministratorRequest.IRequest = {
        actorType: actorType,
        status: status,
        page: 1,
        limit: 5,
      };
      const response: IPageIShoppingMallAdministratorRequest.ISummary =
        await api.functional.shoppingMall.administrator.administratorRequests.index(
          adminConnection,
          { body },
        );
      typia.assert(response);
      // Check pagination info is consistent
      TestValidator.predicate(
        `page current is 1 for actorType=${actorType}, status=${status}`,
        response.pagination.current === 1,
      );
      TestValidator.predicate(
        `page limit is 5 for actorType=${actorType}, status=${status}`,
        response.pagination.limit === 5,
      );
      // Check each data item matches the filter criteria
      for (const item of response.data) {
        TestValidator.equals(
          `actorType matches filter for request ${item.id}`,
          item.actorType,
          actorType,
        );
        TestValidator.equals(
          `status matches filter for request ${item.id}`,
          item.status,
          status,
        );
        // Timestamps are expected and type-asserted by typia
      }
    }
  }
}
