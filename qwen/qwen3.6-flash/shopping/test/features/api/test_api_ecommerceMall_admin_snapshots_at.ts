import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshot";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_admin_snapshots_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallSnapshot =
    await api.functional.ecommerceMall.admin.snapshots.at(connection, {
      snapshotId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
