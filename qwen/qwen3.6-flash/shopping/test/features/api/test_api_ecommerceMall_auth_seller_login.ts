import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import typia from "typia";

export async function test_api_ecommerceMall_auth_seller_login(
  connection: api.IConnection,
) {
  const output: IEcommerceMallSeller.IAuthorized =
    await api.functional.ecommerceMall.auth.seller.login(connection, {
      body: typia.random<IEcommerceMallSeller.ILogin>(),
    });
  typia.assert(output);
}
