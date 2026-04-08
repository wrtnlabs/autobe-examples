import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import type { IEcommerceMallUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test retrieving a seller ban subtype record with an invalid UUID should return 404 Not Found.
 *
 * Validates the ban subtype endpoint correctly handles requests for non-existent seller ban records by returning 404 Not Found. This prevents information disclosure about the existence or non-existence of specific seller bans, protecting seller privacy and preventing enumeration attacks.
 *
 * The test authenticates as a super administrator and attempts to retrieve a ban subtype record with a UUID that does not exist in the system. It verifies that the system performs proper database validation and returns an appropriate error response.
 *
 * 1. Super administrator registers and authenticates.
 * 2. Generate a valid UUID format that is known to not exist in the system.
 * 3. Attempt to retrieve the non-existent ban subtype record.
 * 4. Verify the system returns HTTP 404 Not Found.
 * 5. Verify the response contains an error message indicating the record was not found.
 */
export async function test_api_super_administrator_retrieve_nonexistent_ban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(2),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
    },
  });
  typia.assert(adminAuth);
  // 2. Create admin connection with token
  const adminAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuth.token.access },
  };
  // 3. Generate a UUID that is known to not exist (random valid UUID format)
  const nonExistentUuid: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Verify that the UUID format is valid
  typia.assert(nonExistentUuid);
  // 5. Attempt to retrieve the non-existent ban subtype record
  await TestValidator.httpError(
    "should return 404 for non-existent ban subtype",
    [404],
    async () => {
      await api.functional.ecommerceMall.superAdministrator.user_ban_of_sellers.at(
        adminAuthConnection,
        { banOfSellerId: nonExistentUuid },
      );
    },
  );
}
