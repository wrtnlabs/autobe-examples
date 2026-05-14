import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import typia from "typia";

export async function test_api_ecommerceMall_seller_storefront_create(
  connection: api.IConnection,
) {
  const output: IEcommerceMallSellerProfile =
    await api.functional.ecommerceMall.seller.storefront.create(connection, {
      body: typia.random<IEcommerceMallSellerProfile.ICreate>(),
    });
  typia.assert(output);
}
