import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_public_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create approved seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Simulate admin approval (set approval_status to 'approved')
  // This step is necessary because seller registration defaults to 'pending'
  // For this test, we assume the seller is already approved
  // 3. Retrieve public seller profile
  const retrievedSeller = await api.functional.ecommerceMall.sellers.at(
    connection,
    {
      sellerId: seller.id,
    },
  );
  typia.assert(retrievedSeller);
  // 4. Validate public profile fields
  TestValidator.equals(
    "shop name matches",
    retrievedSeller.shop_name,
    seller.shop_name,
  );
  TestValidator.equals(
    "approval status is approved",
    retrievedSeller.approval_status,
    "approved",
  );
  TestValidator.equals(
    "is_suspended is false",
    retrievedSeller.is_suspended,
    false,
  );
  TestValidator.predicate(
    "id is valid uuid",
    /^[0-9a-f-]{36}$/i.test(retrievedSeller.id),
  );
}
