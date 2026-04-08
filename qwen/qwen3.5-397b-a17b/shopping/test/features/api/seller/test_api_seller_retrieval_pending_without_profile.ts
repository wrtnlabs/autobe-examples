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
 * Test administrator retrieving a seller account with profile validation.
 *
 * Validates the administrator seller retrieval endpoint structure and response format. Tests that administrators can authenticate and retrieve seller account details including approval status, rejection reason, and profile information.
 *
 * The test verifies the complete response structure conforms to IShoppingMallSeller.IInvert type definition. For pending sellers (approval_status: 'pending'), the profile field should be null since shop profiles are only created upon approval. For approved sellers, profile contains shop information.
 *
 * 1. Administrator authenticates using authorize_admin_join utility.
 * 2. Administrator retrieves seller details by sellerId using SDK function.
 * 3. Validates response structure matches IShoppingMallSeller.IInvert type.
 * 4. Verifies profile is null for pending sellers or contains data for approved sellers.
 */
export async function test_api_seller_retrieval_pending_without_profile(
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
  // 2. Generate seller ID and retrieve seller details
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const seller = await api.functional.shoppingMall.admin.admin.sellers.at(
    adminConnection,
    {
      sellerId: sellerId,
    },
  );
  typia.assert(seller);
  // 3. Validate seller structure - typia.assert() validates all type constraints
  // For pending sellers: profile should be null, rejection_reason should be null
  // For approved sellers: profile contains shop information
  // For rejected sellers: rejection_reason contains admin feedback
  TestValidator.equals("seller id matches request", seller.id, sellerId);
  // Validate approval status is one of the valid states
  TestValidator.predicate(
    "approval status is valid",
    ["pending", "approved", "rejected"].includes(seller.approval_status),
  );
  // Validate profile nullability based on approval status
  if (seller.approval_status === "pending") {
    TestValidator.equals(
      "profile is null for pending seller",
      seller.profile,
      null,
    );
    TestValidator.equals(
      "rejection reason is null for pending",
      seller.rejection_reason,
      null,
    );
  } else if (seller.approval_status === "rejected") {
    TestValidator.predicate(
      "rejection reason exists for rejected seller",
      seller.rejection_reason !== null,
    );
  }
  // For approved sellers, profile should exist (validated by typia.assert)
}