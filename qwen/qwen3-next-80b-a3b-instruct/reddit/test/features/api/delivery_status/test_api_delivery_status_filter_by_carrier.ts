import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformDeliveryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeliveryStatus";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformDeliveryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformDeliveryStatus";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_delivery_status_filter_by_carrier(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com/join",
    referrer: "https://example.com",
    ip: null,
  } satisfies ICommunityPlatformAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminCredentials });
  // adminConnection.headers is now updated internally by authorize function
  // Step 2: Retrieve some delivery statuses to get existing carrier codes
  const initialResults =
    await api.functional.communityPlatform.delivery_statuses.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformDeliveryStatus.IRequest,
      },
    );
  typia.assert(initialResults);
  // Step 3: Validate we have some records
  TestValidator.predicate(
    "at least one delivery status record exists",
    initialResults.data.length > 0,
  );
  // Step 4: Choose a carrier code from existing records to filter by
  const targetRecord = initialResults.data[0];
  const carrierCode = targetRecord.carrier_id; 
  // Step 5: Filter delivery statuses by the specific carrier code
  const filteredResults =
    await api.functional.communityPlatform.delivery_statuses.index(
      adminConnection,
      {
        body: {
          carrier_code: carrierCode, 
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformDeliveryStatus.IRequest,
      },
    );
  typia.assert(filteredResults);
  // Step 6: Validate that only records with matching carrier code are returned
  TestValidator.predicate(
    "filtered result count should be at least 1",
    filteredResults.data.length > 0,
  );
  // Verify all returned records have the correct carrier code
  filteredResults.data.forEach((record) => {
    TestValidator.equals(
      "carrier code matches filter",
      record.carrier_id, 
      carrierCode,
    );
  });
  // Verify pagination details are correct
  TestValidator.equals(
    "pagination current page should be 1",
    filteredResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    filteredResults.pagination.limit,
    10,
  );
}