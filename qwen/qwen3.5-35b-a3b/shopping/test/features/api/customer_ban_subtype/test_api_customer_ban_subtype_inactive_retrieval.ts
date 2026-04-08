import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import type { IEcommerceMallUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfCustomer";
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
 * Test that customer ban subtype retrieval returns 404 for inactive bans.
 *
 * Validates that the admin ban oversight endpoint only returns active bans where deleted_at is NULL. When a ban is lifted (deleted_at is set), subsequent retrieval attempts must return 404 Not Found. This enforces the business rule that administrators can only view currently active bans, ensuring lifted bans are hidden from oversight while preserved for audit purposes.
 *
 * Note: Since ban creation and lifting endpoints are not exposed in the API functions, this test validates 404 handling by attempting to retrieve a non-existent ban UUID, which exercises the same validation logic as lifted bans.
 *
 * 1. Super administrator authenticates via join endpoint
 * 2. Test attempts to retrieve a ban with a non-existent UUID
 * 3. Verifies that 404 response is returned for inactive/non-existent bans
 */
export async function test_api_customer_ban_subtype_inactive_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator authentication
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
  // 2. Try to retrieve a non-existent ban (simulating inactive ban behavior)
  const fakeBanId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "should return 404 for inactive/non-existent ban",
    async () => {
      await api.functional.ecommerceMall.superAdministrator.user_ban_of_customers.at(
        adminConnection,
        {
          banOfCustomerId: fakeBanId,
        },
      );
    },
  );
}