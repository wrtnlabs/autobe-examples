import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSellerOnboardingCompletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerOnboardingCompletion";
import type { IShoppingMallSellerOnboardingSteps } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerOnboardingSteps";
export async function test_api_seller_onboarding_incomplete_status_retrieved(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the seller
  const sellerConnection: api.IConnection = { host: connection.host };
  // Generate a random seller ID to retrieve onboarding status
  const sellerId: string = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the seller's onboarding completion status
  const onboardingStatus: IShoppingMallSellerOnboardingCompletion =
    await api.functional.shoppingMall.sellers.onboarding_completion.at(
      sellerConnection,
      {
        sellerId: sellerId,
      },
    );
  typia.assert(onboardingStatus);
  // Validate the onboarding status
  // When a seller is registered, the system creates an onboarding record with incomplete status
  // This means: completed: false, rejection_reason: null, and at least one step is false
  TestValidator.equals(
    "completed should be false",
    onboardingStatus.completed,
    false,
  );
  TestValidator.equals(
    "rejection_reason should be null",
    onboardingStatus.rejection_reason,
    null,
  );
  TestValidator.predicate(
    "at least one onboarding step should be false",
    () => {
      return (
        !onboardingStatus.steps.identity_verification ||
        !onboardingStatus.steps.business_documentation ||
        !onboardingStatus.steps.bank_account_linkage ||
        !onboardingStatus.steps.compliance_approval
      );
    },
  );
}
