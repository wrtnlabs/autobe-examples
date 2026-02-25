import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_retrieval_active_account(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection using authorization utility
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_url: typia.random<string & tags.Format<"uri">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceSeller.IJoin;
  const authorizedSeller = await api.functional.ecommerce.auth.seller.join(
    sellerConnection,
    {
      body: joinInput,
    },
  );
  typia.assert(authorizedSeller);
  // Retrieve the seller details using the sellers.at endpoint
  const retrievedSeller = await api.functional.ecommerce.sellers.at(
    sellerConnection,
    {
      sellerId: authorizedSeller.id,
    },
  );
  typia.assert(retrievedSeller);
  // Validate business logic - seller account should be retrievable and have matching data
  TestValidator.equals(
    "seller id matches",
    retrievedSeller.id,
    authorizedSeller.id,
  );
  TestValidator.equals(
    "email matches",
    retrievedSeller.email,
    authorizedSeller.email,
  );
  TestValidator.equals(
    "shop name matches",
    retrievedSeller.shop_name,
    authorizedSeller.shop_name,
  );
  TestValidator.predicate(
    "seller account is retrievable",
    () =>
      retrievedSeller.account_status === "active" ||
      retrievedSeller.account_status === "approved",
  );
}
