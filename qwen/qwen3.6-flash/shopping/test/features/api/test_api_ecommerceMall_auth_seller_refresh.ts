import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import typia from "typia";

export async function test_api_ecommerceMall_auth_seller_refresh(
  connection: api.IConnection,
) {
  const output: IEcommerceMallSeller.IAuthorized =
    await api.functional.ecommerceMall.auth.seller.refresh(connection, {
      body: typia.random<IEcommerceMallSeller.IRefresh>(),
    });
  typia.assert(output);
}
