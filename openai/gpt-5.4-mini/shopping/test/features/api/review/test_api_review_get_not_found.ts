import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Verifies that fetching an unknown seller review identifier returns not found.
 *
 * This test authenticates a seller, then requests a randomly generated review UUID that should not exist in the system. It validates that the seller review lookup does not fabricate review content or expose unrelated snapshot data when the identifier is unknown.
 *
 * 1. Register and authenticate a seller account using a dedicated seller connection.
 * 2. Request a review using a random UUID that is not expected to exist.
 * 3. Assert that the endpoint responds with a not-found HTTP error.
 */
export async function test_api_review_get_not_found(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
    } satisfies IMallPlatformSeller.IJoin,
  });
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unknown review should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.seller.reviews.at(sellerConnection, {
        reviewId,
      });
    },
  );
}
