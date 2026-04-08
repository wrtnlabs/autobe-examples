import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_mall_platform_review } from "../prepare/prepare_random_mall_platform_review";

/**
 * Generate a random mall platform review via the API for E2E testing.
 *
 * Prepares valid review creation data using the shared prepare function, then
 * calls the customer review creation endpoint to persist the real resource.
 * The returned review can be used in follow-up E2E scenarios that need a
 * purchased-item review record.
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
