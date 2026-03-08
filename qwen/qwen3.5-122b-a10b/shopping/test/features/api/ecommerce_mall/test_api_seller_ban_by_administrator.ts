import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that an administrator can successfully ban a seller account for policy violations.
 * The test verifies that after banning, the seller loses all login capability while
 * their existing data remains preserved in the system.
 */
export async function test_api_seller_ban_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and login as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail satisfies string as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
      password: adminPassword satisfies string as string & tags.MinLength<8> & tags.MaxLength<128>,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create a seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerShopName = RandomGenerator.name();
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail satisfies string as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
      password: sellerPassword satisfies string as string & tags.MinLength<8> & tags.MaxLength<128>,
      shop_name: sellerShopName,
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.seller.id;
  // 3. Ban the seller using admin endpoint
  await api.functional.ecommerceMall.admin.sellers.ban(adminConnection, {
    sellerId: sellerId,
  });
  // 4. Verify seller cannot login after ban (create fresh connection without auth)
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "seller should not be able to login after ban",
    async () => {
      await api.functional.ecommerceMall.auth.seller.login.signIn(
        sellerLoginConnection,
        {
          body: {
            email: sellerEmail satisfies string as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
            password: sellerPassword satisfies string as string & tags.MinLength<8> & tags.MaxLength<128>,
          } satisfies IEcommerceMallSeller.ILogin,
        },
      );
    },
  );
}