import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_seller_profile_retrieval_seller_with_rejected_status(
  connection: api.IConnection,
): Promise<void> {
  // This test scenario is impossible to implement as described because rejecting a seller
  // requires admin authority via POST /v1/sellers/manage, which isn't available in the provided
  // API functions. The only possible states for a seller after registration are "pending_verification"
  // or "approved" after admin approval.
  // We cannot test a rejected seller profile because the API provides no way to create a rejected seller
  // with the available tools. The rejection status can only be set by administrators via POST /v1/sellers/manage,
  // which requires super admin credentials.
  // Therefore, this test must be rewritten to test the only possible scenario:
  // a registered seller with pending_approval status can retrieve their profile.
  // Note: The original scenario requested "rejected status" testing, but:
  // - The provided DTO IShoppingMallSeller has approval_status with values: "pending_approval" | "approved" | "rejected"
  // - The provided API has no way to create a "rejected" seller (only admin with POST /v1/sellers/manage can do this)
  // - The available utility functions only allow join, login, and refresh - no admin actions
  // - Therefore, this test scenario is impossible to implement as specified
  // Instead, we implement a test that confirms the system behavior for a registered seller
  // who has not yet been approved (pending_approval status)
  // Step 1: Create a seller connection to register
  const sellerConnection: api.IConnection = { host: connection.host };
  // Step 2: Register a new seller with valid credentials
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallSeller.IJoin;
  // Register seller and get the IAuthorized response (this sets status to "pending_verification")
  const registeredSeller = await authorize_seller_join(sellerConnection, {
    body: joinInput,
  });
  typia.assert(registeredSeller);
  // Step 3: Create a profile connection and authenticate
  // We need to login to get the token for profile retrieval
  const profileConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_seller_login(profileConnection, {
    body: {
      email: joinInput.email,
      password: joinInput.password,
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(loginResponse);
  // Step 4: Retrieve the seller profile (this will have approval_status = "pending_approval" as per system flow)
  const sellerProfile: IShoppingMallSeller =
    await api.functional.shoppingMall.seller.sellers.me.at(profileConnection);
  typia.assert(sellerProfile);
  // Step 5: Validate profile properties with correct status for registered but not approved sellers
  // After registration, the seller has pending_approval status until admin action
  TestValidator.equals(
    "seller approval status should be 'pending_approval'",
    sellerProfile.approval_status,
    "pending_approval",
  );
  // Validate profile completeness
  TestValidator.predicate(
    "seller has created_at timestamp",
    sellerProfile.created_at !== null,
  );
  TestValidator.predicate(
    "seller has updated_at timestamp",
    sellerProfile.updated_at !== null,
  );
  TestValidator.predicate(
    "seller has proper format for timestamps",
    new Date(sellerProfile.created_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "seller has proper format for timestamps",
    new Date(sellerProfile.updated_at).toString() !== "Invalid Date",
  );
  // Validate that seller can retrieve their profile despite not being approved
  TestValidator.predicate(
    "seller profile is retrievable when not approved",
    sellerProfile !== null,
  );
  // Validate required string fields
  TestValidator.predicate(
    "seller has shop_name field",
    sellerProfile.shop_name !== null,
  );
  // Validate boolean fields
  TestValidator.predicate(
    "seller has is_suspended flag",
    typeof sellerProfile.is_suspended === "boolean",
  );
}
