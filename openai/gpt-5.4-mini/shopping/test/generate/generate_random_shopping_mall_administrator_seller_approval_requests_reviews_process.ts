import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import type { IShoppingMallSellerApprovalRequestReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequestReview";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_seller_approval_request_review } from "../prepare/prepare_random_shopping_mall_seller_approval_request_review";

export async function generate_random_shopping_mall_administrator_seller_approval_requests_reviews_process(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IShoppingMallSellerApprovalRequestReview.ICreate>
      | undefined;
    params: {
      sellerApprovalRequestId: string;
    };
  },
): Promise<IShoppingMallSellerApprovalRequest> {
  const prepared: IShoppingMallSellerApprovalRequestReview.ICreate =
    prepare_random_shopping_mall_seller_approval_request_review(props.body);
  return await api.functional.shoppingMall.administrator.seller_approval_requests.reviews.process(
    connection,
    {
      body: prepared,
      sellerApprovalRequestId: props.params.sellerApprovalRequestId,
    },
  );
}
