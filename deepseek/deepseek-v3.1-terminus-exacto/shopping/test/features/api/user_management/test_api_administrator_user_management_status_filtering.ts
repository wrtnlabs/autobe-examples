import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMetadataRegistryRelationship";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test user search with specific account status filtering to verify platform oversight capabilities.
 */
export async function test_api_administrator_user_management_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123" satisfies string & tags.Format<"password">,
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Test filtering by different account statuses
  const statuses = ["active", "pending", "suspended", "banned"] as const;
  for (const status of statuses) {
    const response =
      await api.functional.ecommerce.administrator.user_management.index(
        adminConnection,
        {
          body: {
            accountStatus: status,
            limit: 10,
            page: 1,
          } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
        },
      );
    typia.assert(response);
    TestValidator.predicate(
      `${status} status returns valid pagination`,
      response.pagination.records >= 0,
    );
  }
  // Test combinations of status with userType
  const userTypes = [
    "customer",
    "seller",
    "administrator",
    "superAdministrator",
  ] as const;
  for (const userType of userTypes) {
    for (const status of statuses) {
      const response =
        await api.functional.ecommerce.administrator.user_management.index(
          adminConnection,
          {
            body: {
              userType: userType,
              accountStatus: status,
              limit: 5,
              page: 1,
            } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
          },
        );
      typia.assert(response);
      TestValidator.predicate(
        `${userType} with ${status} status returns valid structure`,
        response.pagination.limit === 5,
      );
    }
  }
  // Test edge cases: mixed filters
  const mixedResponse =
    await api.functional.ecommerce.administrator.user_management.index(
      adminConnection,
      {
        body: {
          userType: "seller",
          accountStatus: "suspended",
          search: "test",
          limit: 3,
          page: 1,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(mixedResponse);
  // Test empty status (should return all users)
  const allUsersResponse =
    await api.functional.ecommerce.administrator.user_management.index(
      adminConnection,
      {
        body: {
          accountStatus: null,
          limit: 20,
          page: 1,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(allUsersResponse);
  TestValidator.predicate(
    "null status returns comprehensive results",
    allUsersResponse.pagination.records >= 0,
  );
  // Test date range filtering with status
  const dateRangeResponse =
    await api.functional.ecommerce.administrator.user_management.index(
      adminConnection,
      {
        body: {
          accountStatus: "active",
          createdAt_from: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          createdAt_to: new Date().toISOString(),
          limit: 10,
          page: 1,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
}
