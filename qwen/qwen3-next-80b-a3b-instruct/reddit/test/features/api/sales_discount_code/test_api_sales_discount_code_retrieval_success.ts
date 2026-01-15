import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformSaleDiscountCode } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleDiscountCode";
export async function test_api_sales_discount_code_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Define a known active discount code that should pre-exist in the test environment
  const testCode = "ACTIVE_DISCOUNT_E2E";
  // Retrieve the discount code from the system
  const retrievedCode: ICommunityPlatformSaleDiscountCode =
    await api.functional.communityPlatform.salesdiscountcodes.at(connection, {
      discountCode: testCode,
    });
  typia.assert(retrievedCode);
  // Validate that the retrieved code is active and has expected configuration
  TestValidator.equals("discount code matches", retrievedCode.code, testCode);
  TestValidator.predicate("discount code is active", retrievedCode.isActive);
  TestValidator.predicate(
    "discount amount is not negative",
    retrievedCode.discountAmount >= 0,
  );
  TestValidator.predicate(
    "max uses is non-negative",
    retrievedCode.maxUses >= 0,
  );
  // Validate the discount type is one of the allowed values
  const validTypes: Array<"percentage" | "fixed"> = ["percentage", "fixed"];
  TestValidator.predicate(
    "discount type is valid",
    validTypes.includes(retrievedCode.discountType),
  );
  // Validate expiration date is in the future (or today) - active code
  const today = new Date().toISOString().split("T")[0];
  TestValidator.predicate(
    "expiration date is not in the past",
    retrievedCode.expirationDate >= today,
  );
}
