import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallSellerApprovalReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalReview";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_admin_sellers_approval_reviews_create(
  connection: api.IConnection,
) {
  const output: IEcommerceMallSellerApprovalReview =
    await api.functional.ecommerceMall.admin.sellers.approval_reviews.create(
      connection,
      {
        sellerId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IEcommerceMallSellerApprovalReview.ICreate>(),
      },
    );
  typia.assert(output);
}
