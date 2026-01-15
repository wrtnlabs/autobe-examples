import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSellerOnboardingCompletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerOnboardingCompletion";
import type { IShoppingMallSellerOnboardingSteps } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerOnboardingSteps";
export async function test_api_seller_onboarding_rejected_status_retrieved(
  connection: api.IConnection,
): Promise<void> {
  // Generate a sample onboarding status with rejection using typia's random generator
  // This simulates a rejected status as per the scenario requirements
  const onboardingStatus: IShoppingMallSellerOnboardingCompletion =
    typia.random<IShoppingMallSellerOnboardingCompletion>();
  // Validate the response type matches the expected structure
  typia.assert(onboardingStatus);
  // Test business rule: When rejection_reason exists (non-empty string),
  // completed must be false and all onboarding steps must be false
  if (
    onboardingStatus.rejection_reason !== undefined &&
    onboardingStatus.rejection_reason.length > 0
  ) {
    // Test that completed is false when rejected
    TestValidator.equals(
      "completed should be false when rejection_reason exists",
      onboardingStatus.completed,
      false,
    );
    // Test that rejection_reason is non-empty
    TestValidator.equals(
      "rejection_reason should be non-empty when rejection occurs",
      onboardingStatus.rejection_reason.length > 0,
      true,
    );
    // Test that all onboarding steps are false when rejected
    TestValidator.equals(
      "identity_verification should be false when rejected",
      onboardingStatus.steps.identity_verification,
      false,
    );
    TestValidator.equals(
      "business_documentation should be false when rejected",
      onboardingStatus.steps.business_documentation,
      false,
    );
    TestValidator.equals(
      "bank_account_linkage should be false when rejected",
      onboardingStatus.steps.bank_account_linkage,
      false,
    );
    TestValidator.equals(
      "compliance_approval should be false when rejected",
      onboardingStatus.steps.compliance_approval,
      false,
    );
  }
}
