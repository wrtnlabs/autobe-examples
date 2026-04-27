import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_registration_duplicate_email_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a seller with a specific email address
  const email = typia.random<string & tags.Format<"email">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  const first = await authorize_seller_join(sellerConnection, {
    body: {
      email,
      shop_name: "Original Shop",
    },
  });
  typia.assert(first);
  // 2. Attempt second registration with the same email address
  //    Expect 409 Conflict due to unique email constraint
  const duplicateConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("duplicate email conflict", 409, async () => {
    await api.functional.eCommerceMall.auth.seller.join(duplicateConnection, {
      body: {
        email,
        password: RandomGenerator.alphaNumeric(16),
        shop_name: "Duplicate Shop",
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IECommerceMallSeller.IJoin,
    });
  });
}
