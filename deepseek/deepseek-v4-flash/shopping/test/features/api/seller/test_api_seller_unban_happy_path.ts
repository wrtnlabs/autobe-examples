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

export async function test_api_seller_unban_happy_path(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the seller unban happy path workflow.
   *
   * Validates the complete lifecycle of banning and unbanning a seller account through administrator actions. An administrator registers and authenticates, a seller registers and obtains credentials, the administrator bans the seller, the administrator unbans the seller, and finally the seller successfully logs in using their original credentials to confirm login ability has been restored.
   *
   * Since the IECommerceMallSeller DTO does not expose a `banned_at` field, the business-level outcome (seller's ability to log in after unban) serves as the primary validation criterion.
   *
   * 1. Register and authenticate as administrator
   * 2. Register a seller and capture email/password credentials
   * 3. Administrator bans the seller via POST /administrator/sellers/{sellerId}/ban
   * 4. Administrator unbans the seller via POST /administrator/sellers/{sellerId}/unban
   * 5. Seller logs in with original credentials to confirm unban success
   */
  // Step 1: Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAuthorized);
  // Step 2: Register a seller and capture credentials
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuthorized);
  // Step 3: As administrator, ban the seller
  const bannedSeller =
    await api.functional.eCommerceMall.administrator.sellers.ban.create(
      adminConnection,
      {
        sellerId: sellerAuthorized.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IECommerceMallSeller.IBan,
      },
    );
  typia.assert(bannedSeller);
  // Step 4: As administrator, unban the seller
  const unbannedSeller =
    await api.functional.eCommerceMall.administrator.sellers.unban(
      adminConnection,
      {
        sellerId: sellerAuthorized.id,
      },
    );
  typia.assert(unbannedSeller);
  // Step 5: Verify seller can log in after unban using original credentials
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoggedIn = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallSeller.ILogin,
  });
  typia.assert(sellerLoggedIn);
  TestValidator.equals(
    "seller id matches after successful login post-unban",
    sellerLoggedIn.id,
    sellerAuthorized.id,
  );
}
