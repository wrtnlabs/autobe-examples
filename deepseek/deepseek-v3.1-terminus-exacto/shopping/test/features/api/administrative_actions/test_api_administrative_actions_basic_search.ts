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

export async function test_api_administrative_actions_basic_search(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password:
        typia.random<string & tags.Format<"password">>() ||
        RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Perform basic search with default pagination parameters
  const searchResponse =
    await api.functional.ecommerce.administrator.administrative_actions.index(
      adminConnection,
      {
        body: {
          userType: undefined,
          accountStatus: undefined,
          search: undefined,
          createdAt_from: undefined,
          createdAt_to: undefined,
          page: undefined, // Let API use default page (typically 1)
          limit: undefined, // Let API use default limit
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(searchResponse);
  // Validate pagination metadata exists and has valid values
  // typia.assert() already validates all required fields, so we just check business logic
  TestValidator.predicate(
    "pagination calculation is correct",
    searchResponse.pagination.pages ===
      Math.ceil(
        searchResponse.pagination.records / searchResponse.pagination.limit,
      ),
  );
  // Validate each administrative action has basic required fields
  // These are already validated by typia.assert() but we add business logic checks
  for (const action of searchResponse.data) {
    // Basic string field validation (typia.assert already validates types)
    TestValidator.predicate(
      "action has valid action_type",
      typeof action.action_type === "string" && action.action_type.length > 0,
    );
    TestValidator.predicate(
      "action has valid general_description",
      typeof action.general_description === "string",
    );
    // Administrator attribution validation (can be null)
    if (action.administrator !== null) {
      TestValidator.predicate(
        "administrator has valid email",
        action.administrator.email.includes("@"),
      );
    }
    // Super administrator attribution validation (can be null)
    if (action.superAdministrator !== null) {
      TestValidator.predicate(
        "superAdministrator has valid email",
        action.superAdministrator.email.includes("@"),
      );
    }
  }
}
