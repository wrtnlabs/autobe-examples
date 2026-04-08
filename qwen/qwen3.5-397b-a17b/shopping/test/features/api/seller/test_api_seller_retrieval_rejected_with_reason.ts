import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator retrieving a seller account that was rejected.
 *
 * Validates the complete workflow for retrieving rejected seller information including administrator authentication, seller details retrieval, and response structure validation. Ensures that rejected sellers have approval_status as 'rejected', rejection_reason containing meaningful administrator feedback, and profile as null since profiles are only created upon approval.
 *
 * The test verifies that the rejection_reason is populated with a non-empty string explaining why the seller application was denied, and that the profile field remains null as rejected sellers never complete the profile creation step in the approval workflow.
 *
 * 1. Administrator authenticates using the join endpoint to create admin account.
 * 2. Administrator retrieves seller details by sellerId.
 * 3. Validates response structure matches IShoppingMallSeller.IInvert type.
 * 4. Asserts approval_status is 'rejected', rejection_reason is non-empty string, and profile is null.
 *
 * Note: This test assumes a rejected seller exists in the test database (created through seed data or separate test setup), as the available APIs don't include seller registration or rejection workflow endpoints.
 */
export async function test_api_seller_retrieval_rejected_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Generate seller ID for retrieval (assumes rejected seller exists in test DB)
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve seller details
  const seller = await api.functional.shoppingMall.admin.admin.sellers.at(
    adminConnection,
    {
      sellerId: sellerId,
    },
  );
  typia.assert(seller);
  // 4. Validate rejected seller structure
  TestValidator.equals("approval status", seller.approval_status, "rejected");
  TestValidator.predicate(
    "rejection reason is non-empty",
    seller.rejection_reason !== null && seller.rejection_reason.length > 0,
  );
  TestValidator.equals("profile is null", seller.profile, null);
}
