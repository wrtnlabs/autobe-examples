import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import type { IShoppingMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSuspension";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_seller_approvals_create_seller_approval } from "../../../generate/generate_random_shopping_mall_administrator_seller_approvals_create_seller_approval";
import { generate_random_shopping_mall_administrator_seller_suspensions_create_seller_suspension } from "../../../generate/generate_random_shopping_mall_administrator_seller_suspensions_create_seller_suspension";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";
import { prepare_random_shopping_mall_seller_suspension } from "../../../prepare/prepare_random_shopping_mall_seller_suspension";

export async function test_api_seller_suspension_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        email: RandomGenerator.alphaNumeric(10) + "@admin.com",
        password: "StrongPass123",
      },
    });
  // 2. Generate a new seller approval with 'approved' status
  const approvalRequest: Partial<IShoppingMallSellerApproval.ICreate> = {
    status: "approved" as const,
  };
  const sellerApproval: IShoppingMallSellerApproval =
    await generate_random_shopping_mall_administrator_seller_approvals_create_seller_approval(
      adminConnection,
      { body: approvalRequest },
    );
  typia.assert(sellerApproval);
  TestValidator.equals(
    "Seller approval status is approved",
    sellerApproval.status,
    "approved",
  );
  // 3. Create suspension for the approved seller
  const suspensionReason = RandomGenerator.paragraph({ sentences: 2 });
  const suspensionRequest: IShoppingMallSellerSuspension.ICreate = {
    seller_id: sellerApproval.shoppingMallSellerId,
    suspension_reason: suspensionReason,
  };
  const suspendedSeller: IShoppingMallSellerSuspension =
    await generate_random_shopping_mall_administrator_seller_suspensions_create_seller_suspension(
      adminConnection,
      { body: suspensionRequest },
    );
  typia.assert(suspendedSeller);
  // 4. Validate suspension record details
  TestValidator.equals(
    "Suspended seller ID matches approval seller ID",
    suspendedSeller.seller.id,
    sellerApproval.shoppingMallSellerId,
  );
  TestValidator.equals(
    "Suspension reason matches input",
    suspendedSeller.suspension_reason,
    suspensionReason,
  );
  TestValidator.predicate(
    "Suspended at is a valid ISO date-time",
    !isNaN(Date.parse(suspendedSeller.suspended_at)),
  );
  TestValidator.predicate(
    "Created at is a valid ISO date-time",
    !isNaN(Date.parse(suspendedSeller.created_at)),
  );
  TestValidator.predicate(
    "Updated at is a valid ISO date-time",
    !isNaN(Date.parse(suspendedSeller.updated_at)),
  );
  TestValidator.equals(
    "Deleted at is null initially",
    suspendedSeller.deleted_at,
    null,
  );
  // 5. Additional business rule checks could be added here to verify suspension effects
}
