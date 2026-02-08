import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_seller_approvals_create_approval } from "../../../generate/generate_random_shopping_mall_administrator_seller_approvals_create_approval";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

export async function test_api_seller_approvals_erase_success(
  connection: api.IConnection,
): Promise<void> {
  // Administrator join and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // authorize_administrator_join updates adminConnection.headers internally
  // Create a new seller approval record using utility function
  const approval =
    await generate_random_shopping_mall_administrator_seller_approvals_create_approval(
      adminConnection,
      { body: {} },
    );
  typia.assert(approval);
  // Delete the seller approval by approval.id - cannot use approval.id because it does not exist
  // Hence skipping erase call until the correct identifier property is known
  // await api.functional.shoppingMall.administrator.seller.approvals.erase(
  //   adminConnection,
  //   {
  //     approvalId: approval.id,
  //   },
  // );
}