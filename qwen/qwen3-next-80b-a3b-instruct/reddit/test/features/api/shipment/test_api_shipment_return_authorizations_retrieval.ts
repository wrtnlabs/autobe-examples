import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformShipmentReturnAuthorization } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentReturnAuthorization";
import type { IEReturnAuthorizationStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEReturnAuthorizationStatus";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformShipmentReturnAuthorization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformShipmentReturnAuthorization";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_shipment_return_authorizations_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com/join",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminData });
  // Step 2: Generate a random shipment ID for retrieval
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Retrieve return authorizations for the shipment
  const result: IPageICommunityPlatformShipmentReturnAuthorization.ISummary =
    await api.functional.communityPlatform.admin.shipments.return_authorizations.index(
      adminConnection,
      { shipmentId },
    );
  typia.assert(result);
  // Step 4: Validate that we got a valid response structure
  TestValidator.equals("response exists", result, result);
  TestValidator.predicate(
    "pagination is present",
    () => result.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array is present",
    () => result.data !== undefined,
  );
}
