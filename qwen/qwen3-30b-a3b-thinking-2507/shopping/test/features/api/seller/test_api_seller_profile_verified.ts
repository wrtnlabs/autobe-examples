import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_seller_profile_verified(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller account
  const seller = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // Step 2: Retrieve public profile for this seller
  const publicProfile = await api.functional.v1.seller._public.publicProfile(
    connection,
    {
      sellerId: seller.id,
    },
  );
  typia.assert(publicProfile);
  // Step 3: Verify the verification status
  TestValidator.equals("verified should be true", publicProfile.verified, true);
}