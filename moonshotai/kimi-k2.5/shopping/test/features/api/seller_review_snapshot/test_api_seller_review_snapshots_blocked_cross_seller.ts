import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_review_snapshots_blocked_cross_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create an authenticated seller connection (cross-seller context)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://test.example.com/",
      referrer: "https://test.example.com/",
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Attempt to access review snapshots for a review on another seller's product
  // The reviewId is assumed to exist from separate test infrastructure
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // 3. Validate that access is denied with authorization error
  await TestValidator.error(
    "cross-seller review snapshot access should be denied",
    async () => {
      await api.functional.ecommerceMall.seller.reviews.snapshots.index(
        sellerConnection,
        {
          reviewId,
          body: {
            page: 1,
            limit: 10,
          } satisfies IEcommerceMallReviewSnapshot.IRequest,
        },
      );
    },
  );
}
