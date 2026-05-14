import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import typia from "typia";

export async function test_api_ecommerceMall_seller_dashboard_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallSellerProfile =
    await api.functional.ecommerceMall.seller.dashboard.at(connection);
  typia.assert(output);
}
