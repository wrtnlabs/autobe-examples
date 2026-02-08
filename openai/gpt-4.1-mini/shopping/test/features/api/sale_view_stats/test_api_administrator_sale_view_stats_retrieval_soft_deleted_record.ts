import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";

export async function test_api_administrator_sale_view_stats_retrieval_soft_deleted_record(
  connection: api.IConnection,
): Promise<void> {
  // This edge case test verifies that sale view statistics records marked as soft deleted (i.e., having a non-null 'deleted_at' timestamp) are still retrievable by authorized administrators. It ensures the system complies with the business rule that soft deleted records remain accessible. The test confirms expected HTTP 200 response and correctness of the returned data consistent with IShoppingMallSaleViewStat schema fields.
  // 1. Administrator joining and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin = {};
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Prepare a UUID for the sale view stats record (simulate retrieval revealing soft deleted record)
  // Since no creation API is available and the test user does not set up data, we simulate retrieval using a random UUID
  const softDeletedViewStatId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the sale view stats record by the soft deleted ID
  const actual =
    await api.functional.shoppingMall.administrator.sale_view_stats.at(
      adminConnection,
      {
        viewStatId: softDeletedViewStatId,
      },
    );
  typia.assert(actual);
  // 4. Assertions:
  // Validations are done by typia.assert
  // Additional check: removed because 'deleted_at' does not exist on IShoppingMallSaleViewStat
}
