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
 * Test that a super administrator can retrieve their own account details.
 *
 * This test validates:
 * 1. Super administrator account creation via join
 * 2. Self-retrieval of account information by ID
 * 3. Response contains all required fields (id, email, created_at, updated_at, deleted_at)
 * 4. Returned ID matches the authenticated super administrator's ID
 * 5. deleted_at is null for active account
 * 6. Timestamps are properly formatted
 */
export async function test_api_super_administrator_retrieve_own_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account using utility function
  const authorized: IShoppingMallSuperAdministrator.IAuthorized =
    await authorize_super_administrator_join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    });
  typia.assert(authorized);
  // 2. Retrieve own account details using the authenticated super administrator's ID
  const account: IShoppingMallSuperAdministrator =
    await api.functional.shoppingMall.superAdministrator.super_administrators.at(
      connection,
      {
        superAdministratorId: authorized.id,
      },
    );
  typia.assert(account);
  // 3. Verify the returned ID matches the authenticated super administrator's ID
  TestValidator.equals("account ID matches", account.id, authorized.id);
  // 4. Verify email matches
  TestValidator.equals("email matches", account.email, authorized.email);
  // 5. Confirm deleted_at is null for active account
  TestValidator.equals(
    "deleted_at is null for active account",
    account.deleted_at,
    null,
  );
  // 6. Verify timestamps are properly set (created_at and updated_at should be present)
  TestValidator.predicate("created_at is set", account.created_at !== null);
  TestValidator.predicate("updated_at is set", account.updated_at !== null);
  // 7. Verify created_at and updated_at are in ISO 8601 date-time format
  TestValidator.predicate(
    "created_at is valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(account.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(account.updated_at),
  );
}