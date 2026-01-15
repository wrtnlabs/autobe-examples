import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSellerOnboardingCompletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerOnboardingCompletion";
import type { IShoppingMallSellerOnboardingSteps } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerOnboardingSteps";
export async function test_api_seller_onboarding_completion_status_retrieved(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Generate a random sellerId that represents a seller who has completed all onboarding steps
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 2: Retrieve the onboarding completion status for the seller
  const onboardingStatus =
    await api.functional.shoppingMall.sellers.onboarding_completion.at(
      connection,
      {
        sellerId: sellerId,
      },
    );
  typia.assert(onboardingStatus);
  // Step 3: Validate the response matches expected complete status
  // According to the IShoppingMallSellerOnboardingCompletion interface,
  // the system should return completed: true and all steps as true for a seller who has completed onboarding
  TestValidator.equals(
    "seller_id matches",
    onboardingStatus.seller_id,
    sellerId,
  );
  TestValidator.equals(
    "rejection_reason is null",
    onboardingStatus.rejection_reason,
    null,
  );
  TestValidator.equals("completed is true", onboardingStatus.completed, true);
  TestValidator.equals(
    "identity_verification is true",
    onboardingStatus.steps.identity_verification,
    true,
  );
  TestValidator.equals(
    "business_documentation is true",
    onboardingStatus.steps.business_documentation,
    true,
  );
  TestValidator.equals(
    "bank_account_linkage is true",
    onboardingStatus.steps.bank_account_linkage,
    true,
  );
  TestValidator.equals(
    "compliance_approval is true",
    onboardingStatus.steps.compliance_approval,
    true,
  );
}
