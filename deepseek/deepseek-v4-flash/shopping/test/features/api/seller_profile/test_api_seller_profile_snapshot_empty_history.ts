import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a newly registered seller with no profile edits receives an empty snapshot history.
 *
 * Validates the core business rule: profile snapshots are created ONLY when the seller edits their shop name, shop description, or logo image. A seller who has just registered and never edited their profile should have zero snapshots, and the API must return a valid empty paginated page rather than a 404 error.
 *
 * 1. Register a new seller account using the authorize_seller_join utility, which creates the seller profile atomically during registration.
 * 2. Request the seller's profile snapshot history with default pagination.
 * 3. Validate that the response is a valid paginated page with zero records and an empty data array.
 */
export async function test_api_seller_profile_snapshot_empty_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Fetch snapshot history with default pagination
  const page: IPageIECommerceMallSellerProfileSnapshot.ISummary =
    await api.functional.eCommerceMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {} satisfies IECommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(page);
  // 3. Validate empty paginated response
  TestValidator.equals("current page", page.pagination.current, 1);
  TestValidator.predicate(
    "limit is a positive integer",
    page.pagination.limit > 0,
  );
  TestValidator.equals("records count", page.pagination.records, 0);
  TestValidator.equals("pages count", page.pagination.pages, 0);
  TestValidator.equals("data array is empty", page.data.length, 0);
}
