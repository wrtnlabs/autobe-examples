import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfileSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Retrieves the authenticated seller's seller profile snapshot history.
 *
 * Validates that a seller can access the immutable, paginated history of storefront profile changes through the snapshot history endpoint. The test confirms the response is a page of snapshot summaries and that each returned snapshot preserves historical storefront identity data for audit and dispute review.
 *
 * This scenario focuses on the basic successful browse path. It checks that the endpoint returns pagination metadata and snapshot records containing the preserved seller profile reference, shop name, shop description, logo image URI, and creation timestamp without exposing any mutation behavior.
 *
 * 1. Register and authenticate a seller account using the seller join endpoint.
 * 2. Request the seller profile snapshot history with the authenticated seller connection.
 * 3. Validate the paginated response and the immutable snapshot summary payload.
 */
export async function test_api_seller_profile_snapshot_history_list(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234" satisfies string & tags.Format<"password">,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const output =
    await api.functional.mallPlatform.seller.sellerProfileSnapshots.history.at(
      sellerConnection,
    );
  typia.assert(output);
  TestValidator.predicate(
    "pagination current should be non-negative",
    output.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be non-negative",
    output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "history data should be an array",
    Array.isArray(output.data),
  );
}
