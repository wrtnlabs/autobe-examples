import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IPageIEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerProfileSnapshot";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_admin_sellers_profile_snapshots_index(
  connection: api.IConnection,
) {
  const output: IPageIEcommerceMallSellerProfileSnapshot.ISummary =
    await api.functional.ecommerceMall.admin.sellers.profile_snapshots.index(
      connection,
      {
        sellerId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IEcommerceMallSellerProfileSnapshot.IRequest>(),
      },
    );
  typia.assert(output);
}
