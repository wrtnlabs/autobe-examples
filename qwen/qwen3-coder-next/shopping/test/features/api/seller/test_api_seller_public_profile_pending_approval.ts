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

export async function test_api_seller_public_profile_pending_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller with pending approval status
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // Verify seller has pending approval status
  TestValidator.equals(
    "seller has pending approval status",
    seller.approval_status,
    "pending",
  );
  TestValidator.equals("seller is not suspended", seller.is_suspended, false);
  // 2. Create a new anonymous connection to test public profile retrieval
  const anonymousConnection: api.IConnection = { host: connection.host };
  // 3. Retrieve seller's public profile
  const profile = await api.functional.ecommerceMall.sellers.at(
    anonymousConnection,
    {
      sellerId: seller.id,
    },
  );
  typia.assert(profile);
  // 4. Validate public profile data
  TestValidator.equals("profile seller ID matches", profile.id, seller.id);
  TestValidator.equals(
    "profile shop name matches",
    profile.shop_name,
    seller.shop_name,
  );
  TestValidator.equals(
    "profile approval status matches",
    profile.approval_status,
    seller.approval_status,
  );
  TestValidator.equals(
    "profile is_suspended matches",
    profile.is_suspended,
    seller.is_suspended,
  );
  // 5. Verify seller remains in pending state after public profile retrieval
  TestValidator.equals(
    "seller status unchanged",
    seller.approval_status,
    "pending",
  );
}
