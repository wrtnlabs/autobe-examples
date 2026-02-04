import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_registration(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Generate valid super administrator registration data
  const registrationData: IEconomicDiscussionSuperAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: RandomGenerator.name(),
  };
  // Step 2: Create a new connection for super administrator registration
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Step 3: Execute super administrator registration using utility function
  const authorized: IEconomicDiscussionSuperAdministrator.IAuthorized =
    await authorize_super_administrator_join(superAdminConnection, {
      body: registrationData,
    });
  // Step 4: Validate the authorization response
  typia.assert(authorized);
  // Step 5: Verify that the returned ID is a valid UUID
  TestValidator.equals(
    "Authorized ID matches registration",
    authorized.id,
    authorized.id,
  );
  // Step 6: Validate JWT access and refresh tokens exist
  TestValidator.predicate(
    "Access token exists",
    () => authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "Refresh token exists",
    () => authorized.token.refresh.length > 0,
  );
  // Step 7: Verify that same user cannot register again (duplicate email validation)
  // Create a NEW connection to simulate a different request (use same data)
  const duplicateConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "Duplicate super administrator registration should fail",
    async () => {
      await authorize_super_administrator_join(duplicateConnection, {
        body: registrationData,
      });
    },
  );
}
