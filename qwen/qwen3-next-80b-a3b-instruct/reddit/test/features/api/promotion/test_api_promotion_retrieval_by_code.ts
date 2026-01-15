import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPromotion";
export async function test_api_promotion_retrieval_by_code(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random promotion code using typia.random
  const promotionCode = typia.random<string>();
  // Retrieve the promotion by its code
  const retrievedPromotion: ICommunityPlatformPromotion =
    await api.functional.communityPlatform.promotions.at(connection, {
      promotionCode: promotionCode,
    });
  // Validate the retrieved promotion data with typia assertion (handles all type and format validation)
  typia.assert(retrievedPromotion);
  // Verify that the promotion code matches (this is the key business validation)
  TestValidator.equals(
    "promotion code matches",
    retrievedPromotion.code,
    promotionCode,
  );
}
