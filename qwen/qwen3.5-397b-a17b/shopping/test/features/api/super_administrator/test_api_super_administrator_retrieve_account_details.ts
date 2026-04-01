import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test that a super administrator can successfully retrieve another super administrator's account details.
 *
 * This test verifies:
 * 1. Super administrator account creation via join
 * 2. Authentication token propagation for subsequent requests
 * 3. Account retrieval by UUID
 * 4. Response structure validation (id, email, created_at, updated_at, deleted_at)
 * 5. Active account has null deleted_at
 * 6. Data consistency between join response and retrieve response
 */
export async function test_api_super_administrator_retrieve_account_details(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first super administrator account (the authenticated user)
  const firstAdminAuth = await authorize_super_administrator_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdministrator.IJoin,
  });
  typia.assert(firstAdminAuth);
  // Step 2: Create second super administrator account (the target to retrieve)
  const secondAdminEmail = typia.random<string & tags.Format<"email">>();
  const secondAdminAuth = await authorize_super_administrator_join(connection, {
    body: {
      email: secondAdminEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdministrator.IJoin,
  });
  typia.assert(secondAdminAuth);
  // Step 3: Create a new connection with first admin's token and retrieve second admin's details
  const firstAdminConnection: api.IConnection = { host: connection.host };
  firstAdminConnection.headers = {
    Authorization: firstAdminAuth.token.access,
  };
  const retrievedAdmin: IShoppingMallSuperAdministrator =
    await api.functional.shoppingMall.superAdministrator.super_administrators.at(
      firstAdminConnection,
      {
        superAdministratorId: secondAdminAuth.id,
      },
    );
  typia.assert(retrievedAdmin);
  // Step 4: Validate response contains all required fields and values match
  TestValidator.equals(
    "retrieved id matches",
    retrievedAdmin.id,
    secondAdminAuth.id,
  );
  TestValidator.equals(
    "retrieved email matches",
    retrievedAdmin.email,
    secondAdminEmail,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedAdmin.created_at,
    secondAdminAuth.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedAdmin.updated_at,
    secondAdminAuth.updated_at,
  );
  // Step 5: Verify deleted_at is null for active account
  TestValidator.equals(
    "deleted_at is null for active account",
    retrievedAdmin.deleted_at,
    null,
  );
}
