import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_sellers_profile_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallSellerProfile =
    await api.functional.ecommerceMall.sellers.profile.at(connection, {
      sellerId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
