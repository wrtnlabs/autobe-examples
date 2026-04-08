import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import type { IEcommerceMallUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfCustomer";
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
import { generate_random_ecommerce_mall_super_administrator_user_bans_create } from "../../../generate/generate_random_ecommerce_mall_super_administrator_user_bans_create";
import { prepare_random_ecommerce_mall_user_ban } from "../../../prepare/prepare_random_ecommerce_mall_user_ban";

export async function test_api_user_ban_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(2),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
    } satisfies IEcommerceMallSuperAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create first ban for test customer
  const firstBan =
    await generate_random_ecommerce_mall_super_administrator_user_bans_create(
      adminConnection,
      {
        body: {
          user_type: "customer",
          customer_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallUserBan.ICreate,
      },
    );
  typia.assert(firstBan);
  // Validate first ban is active
  TestValidator.equals("first ban is active", firstBan.deleted_at, null);
  TestValidator.equals(
    "first ban has user_type customer",
    firstBan.user_type,
    "customer",
  );
  // 3. Extract customer_id from first ban for duplicate test
  const bannedCustomerId: string & tags.Format<"uuid"> =
    firstBan.customerBan.customer.id;
  // 4. Attempt to create second ban for same customer (should fail with 409 Conflict)
  await TestValidator.error(
    "duplicate ban rejected with 409 Conflict",
    async () => {
      await generate_random_ecommerce_mall_super_administrator_user_bans_create(
        adminConnection,
        {
          body: {
            user_type: "customer",
            customer_id: bannedCustomerId,
            reason: "Attempted duplicate ban",
          } satisfies IEcommerceMallUserBan.ICreate,
        },
      );
    },
  );
  // 5. Verify original ban remains active (deleted_at is still null)
  TestValidator.predicate(
    "original ban remains active",
    () => firstBan.deleted_at === null,
  );
}
