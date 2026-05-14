import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallCancellationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationSnapshot";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_admin_cancellation_requests_snapshots_list(
  connection: api.IConnection,
) {
  const output: IEcommerceMallCancellationSnapshot =
    await api.functional.ecommerceMall.admin.cancellation_requests.snapshots.list(
      connection,
      {
        requestId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
