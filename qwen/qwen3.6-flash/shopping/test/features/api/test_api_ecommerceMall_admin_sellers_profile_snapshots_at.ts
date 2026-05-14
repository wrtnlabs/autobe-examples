import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_admin_sellers_profile_snapshots_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallSellerProfileSnapshot =
    await api.functional.ecommerceMall.admin.sellers.profile_snapshots.at(
      connection,
      {
        sellerId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
