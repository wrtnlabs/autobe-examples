import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import typia from "typia";

export async function test_api_ecommerceMall_admin_sellers_metrics_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallAdmin.IMetric =
    await api.functional.ecommerceMall.admin.sellers.metrics.at(connection);
  typia.assert(output);
}
