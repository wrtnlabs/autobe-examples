import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import { IPageIEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApproval";
import typia from "typia";

export async function test_api_ecommerceMall_admin_sellers_requests_index(
  connection: api.IConnection,
) {
  const output: IPageIEcommerceMallSellerApproval.ISummary =
    await api.functional.ecommerceMall.admin.sellers.requests.index(
      connection,
      {
        body: typia.random<IEcommerceMallSellerApproval.IRequest>(),
      },
    );
  typia.assert(output);
}
