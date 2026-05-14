import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallSellerApprovalReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalReview";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_seller_sellers_approvals_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallSellerApprovalReview =
    await api.functional.ecommerceMall.seller.sellers.approvals.at(connection, {
      sellerId: typia.random<string & tags.Format<"uuid">>(),
      approvalId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
