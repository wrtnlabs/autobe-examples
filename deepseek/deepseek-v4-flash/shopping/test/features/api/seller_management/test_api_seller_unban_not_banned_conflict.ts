import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that unban operation is rejected with 409 Conflict for a seller who has never been banned.
 *
 * Validates the business precondition that the unban endpoint can only reverse an existing ban state. A seller created via normal registration has no ban record (banned_at is null), so attempting to unban them should fail with a 409 Conflict error.
 *
 * 1. Register a new administrator account via the join utility.
 * 2. Register a new seller account via the join utility.
 * 3. As the administrator, attempt to unban the non-banned seller.
 * 4. Verify the server responds with HTTP status 409 Conflict.
 */
export async function test_api_seller_unban_not_banned_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections (never use base connection directly)
  const adminConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  // 1. Register administrator
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Register a new seller (never banned — banned_at is null)
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Attempt to unban a seller who has never been banned → expect 409 Conflict
  await TestValidator.httpError(
    "unban non-banned seller returns 409",
    409,
    async () => {
      await api.functional.eCommerceMall.administrator.sellers.unban(
        adminConnection,
        { sellerId: seller.id },
      );
    },
  );
}
