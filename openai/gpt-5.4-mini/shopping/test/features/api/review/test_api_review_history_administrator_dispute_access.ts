import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_customer_reviews_create } from "../../../generate/generate_random_mall_platform_customer_reviews_create";
import { prepare_random_mall_platform_review } from "../../../prepare/prepare_random_mall_platform_review";

export async function test_api_review_history_administrator_dispute_access(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator access to immutable review history for dispute resolution.
   *
   * This scenario verifies the cross-actor workflow required to inspect preserved review evidence.
   * It creates a real customer review, authenticates a separate administrator session, and retrieves
   * the review history through the seller history endpoint to confirm the administrator can access
   * the preserved record without mutating it.
   *
   * 1. Register and authenticate a customer account.
   * 2. Create a customer review through the review creation endpoint.
   * 3. Register and authenticate a separate administrator account.
   * 4. Request the review history as the administrator and validate that the review identity and
   *    ownership metadata are preserved.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!Abcd" satisfies string & tags.Format<"password">,
      href: "https://example.com/register" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const createdReview =
    await generate_random_mall_platform_customer_reviews_create(
      customerConnection,
      {
        body: {
          rating: 5,
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMallPlatformReview.ICreate,
      },
    );
  typia.assert(createdReview);
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!Abcd" satisfies string & tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const history = await api.functional.mallPlatform.seller.reviews.history.at(
    administratorConnection,
    {
      reviewId: createdReview.reviewId,
    },
  );
  typia.assert(history);
  TestValidator.equals(
    "review history preserves review identity",
    history.reviewId,
    createdReview.reviewId,
  );
  TestValidator.equals(
    "history retains customer ownership information",
    history.customer.id,
    createdReview.customer.id,
  );
  TestValidator.equals(
    "history retains customer email",
    history.customer.email,
    createdReview.customer.email,
  );
  TestValidator.equals(
    "history retains display state",
    history.displayState,
    createdReview.displayState,
  );
}
