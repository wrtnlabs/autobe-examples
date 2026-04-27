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
 * Test that an administrator can suspend a seller account without providing an explicit reason.
 *
 * Validates that the optional {@link IECommerceMallSeller.ISuspend.reason reason}
 * field is truly optional and that the suspension endpoint accepts an empty request
 * body. The administrator creates the suspension action using an admin JWT,
 * targeting a freshly registered seller. After suspension, the returned seller
 * entity is validated via {@link typia.assert} to confirm structural integrity.
 *
 * 1. Register a new administrator via {@link authorize_administrator_join}.
 * 2. Register a new seller via {@link authorize_seller_join}.
 * 3. Suspend the seller with an empty body (no reason).
 * 4. Validate the response is a valid {@link IECommerceMallSeller}.
 */
export async function test_api_seller_suspension_without_reason(
  connection: api.IConnection,
): Promise<void> {
  // ---- Step 1: Register administrator ---- //
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // ---- Step 2: Register seller ---- //
  const sellerConnection: api.IConnection = { host: connection.host };
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
  // ---- Step 3: Suspend seller without a reason ---- //
  const suspended =
    await api.functional.eCommerceMall.administrator.sellers.suspend(
      adminConnection,
      {
        sellerId: seller.id,
        body: {},
      },
    );
  // ---- Step 4: Validate response ---- //
  typia.assert(suspended);
}
