import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_shipment_tracking_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin using the utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  typia.assert(adminAuth);
  // Step 2: Generate random values for the delete operation
  const saleCode = typia.random<string>();
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const trackingId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Delete the shipment tracking record using the SDK function
  await api.functional.communityPlatform.admin.sales.shipments.trackings.erase(
    adminConnection, // Use admin-specific connection
    {
      saleCode: saleCode,
      shipmentId: shipmentId,
      trackingId: trackingId,
    },
  );
  // Step 4: Validate the operation completed successfully by ensuring no error was thrown
  // The API returns void, so successful completion means the tracking record was deleted
}
