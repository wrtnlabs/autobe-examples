import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallSellerApprovalReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalReview";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_admin_sellers_approval_reviews_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallSellerApprovalReview =
    await api.functional.ecommerceMall.admin.sellers.approval_reviews.at(
      connection,
      {
        sellerId: typia.random<string & tags.Format<"uuid">>(),
        reviewId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
