import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_sellers_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallSeller =
    await api.functional.ecommerceMall.sellers.at(connection, {
      sellerId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
