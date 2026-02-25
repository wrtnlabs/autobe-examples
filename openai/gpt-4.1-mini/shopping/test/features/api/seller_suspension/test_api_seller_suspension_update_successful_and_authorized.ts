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

export async function test_api_seller_suspension_update_successful_and_authorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins the system
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "strongpassword",
  };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // 2. Approve a seller registration to enable suspension
  //    -> create a new seller approval with status approved
  const sellerApproval =
    await generate_random_shopping_mall_administrator_seller_approvals_create_seller_approval(
      adminConnection,
      { body: { status: "approved" } },
    );
  typia.assert(sellerApproval);
  // 3. Create a suspension record for that approved seller
  const sellerSuspension =
    await generate_random_shopping_mall_administrator_seller_suspensions_create_seller_suspension(
      adminConnection,
      { body: { seller_id: sellerApproval.shoppingMallSellerId } },
    );
  typia.assert(sellerSuspension);
  // 4. Prepare update data with new suspension reason and suspended_at timestamp
  const newSuspensionReason = RandomGenerator.paragraph({ sentences: 3 });
  const newSuspendedAt = new Date(
    new Date(sellerSuspension.suspended_at).getTime() + 1000 * 60 * 60,
  ).toISOString() as string & tags.Format<"date-time">;
  const updateBody: IShoppingMallSellerSuspension.IUpdate = {
    suspensionReason: newSuspensionReason,
    suspendedAt: newSuspendedAt,
  };
  // 5. Execute update API call
  const updatedSuspension =
    await api.functional.shoppingMall.administrator.sellerSuspensions.update(
      adminConnection,
      {
        sellerSuspensionId: sellerSuspension.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSuspension);
  // Validate updated fields
  TestValidator.equals(
    "updated suspension reason",
    updatedSuspension.suspension_reason,
    newSuspensionReason,
  );
  TestValidator.equals(
    "updated suspended at",
    updatedSuspension.suspended_at,
    newSuspendedAt,
  );
  // Validate immutable fields remain unchanged
  TestValidator.equals(
    "seller id unchanged",
    updatedSuspension.seller.id,
    sellerSuspension.seller.id,
  );
  TestValidator.equals(
    "created at unchanged",
    updatedSuspension.created_at,
    sellerSuspension.created_at,
  );
  // Validate updated_at is refreshed (greater than original)
  TestValidator.predicate(
    "updated_at is refreshed",
    new Date(updatedSuspension.updated_at).getTime() >
      new Date(sellerSuspension.updated_at).getTime(),
  );
  // 6. Validate authorization enforcement
  // Try update without authentication
  await TestValidator.error("unauthorized update fails", async () => {
    const unauthConnection: api.IConnection = { host: connection.host };
    await api.functional.shoppingMall.administrator.sellerSuspensions.update(
      unauthConnection,
      {
        sellerSuspensionId: sellerSuspension.id,
        body: updateBody,
      },
    );
  });
}
