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

export async function test_api_administrator_ban_seller(
  connection: api.IConnection,
): Promise<void> {
  //----
  // Setup: Create administrator
  //----
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: typia.random<IECommerceMallAdministrator.IJoin>(),
  });
  //----
  // Setup: Create seller with known credentials
  //----
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string = RandomGenerator.alphaNumeric(16);
  const sellerConn: api.IConnection = { host: connection.host };
  const seller: IECommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConn,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        shop_name: RandomGenerator.name(),
      },
    },
  );
  typia.assert(seller);
  //----
  // Execution: Administrator bans the seller
  //----
  const banReason: string =
    "Multiple policy violations: fraudulent product listings";
  const bannedSeller: IECommerceMallSeller =
    await api.functional.eCommerceMall.administrator.sellers.ban.create(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          reason: banReason,
        } satisfies IECommerceMallSeller.IBan,
      },
    );
  typia.assert(bannedSeller);
  //----
  // Post-condition validation: Banned seller cannot log in
  //----
  await TestValidator.httpError(
    "banned seller cannot login",
    [401, 403],
    async () => {
      const loginConn: api.IConnection = { host: connection.host };
      await authorize_seller_login(loginConn, {
        body: {
          email: sellerEmail,
          password: sellerPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IECommerceMallSeller.ILogin,
      });
    },
  );
}
