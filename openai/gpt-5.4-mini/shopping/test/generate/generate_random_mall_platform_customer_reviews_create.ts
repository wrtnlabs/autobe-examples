import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_mall_platform_review } from "../prepare/prepare_random_mall_platform_review";

/**
 * Generate a random mall platform review via the API for E2E testing.
 *
 * Prepares valid review creation data using the prepare function, then calls the customer review creation endpoint to persist and return the created review.
 *
 * This function is intended for end-to-end test setup and preserves any DeepPartial overrides passed in through props.body.
 */
export async function generate_random_mall_platform_customer_reviews_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMallPlatformReview.ICreate> | undefined;
  },
): Promise<IMallPlatformReview> {
  const prepared: IMallPlatformReview.ICreate =
    prepare_random_mall_platform_review(props.body);
  return await api.functional.mallPlatform.customer.reviews.create(connection, {
    body: prepared,
  });
}
