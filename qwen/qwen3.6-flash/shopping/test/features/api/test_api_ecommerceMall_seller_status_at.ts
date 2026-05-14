import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import typia from "typia";

export async function test_api_ecommerceMall_seller_status_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallSellerApproval =
    await api.functional.ecommerceMall.seller.status.at(connection);
  typia.assert(output);
}
