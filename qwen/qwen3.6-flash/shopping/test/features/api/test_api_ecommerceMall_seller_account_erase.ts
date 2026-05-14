import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

export async function test_api_ecommerceMall_seller_account_erase(
  connection: api.IConnection,
) {
  const output =
    await api.functional.ecommerceMall.seller.account.erase(connection);
  typia.assert(output);
}
