import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallSellerApprovalReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalReview";
import { IPageIEcommerceMallSellerApprovalReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApprovalReview";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_admin_sellers_approval_reviews_index(
  connection: api.IConnection,
) {
  const output: IPageIEcommerceMallSellerApprovalReview.ISummary =
    await api.functional.ecommerceMall.admin.sellers.approval_reviews.index(
      connection,
      {
        sellerId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IEcommerceMallSellerApprovalReview.IRequest>(),
      },
    );
  typia.assert(output);
}
