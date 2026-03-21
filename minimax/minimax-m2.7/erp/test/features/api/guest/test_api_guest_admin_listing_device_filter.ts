import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_guest_admin_listing_device_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Get all guests first to establish baseline and get device identifiers
  const allGuestsResponse = await api.functional.erpHrm.admin.guests.index(
    adminConnection,
    {
      body: {
        limit: 100,
      } satisfies IErpHrmGuest.IRequest,
    },
  );
  typia.assert(allGuestsResponse);
  // 3. Filter by device_identifier with partial match
  const deviceIdentifiers = allGuestsResponse.data.map(
    (g) => g.device_identifier,
  );
  const partialDeviceId =
    deviceIdentifiers.length > 0
      ? RandomGenerator.substring(deviceIdentifiers[0])
      : RandomGenerator.alphabets(8);
  const filteredResponse = await api.functional.erpHrm.admin.guests.index(
    adminConnection,
    {
      body: {
        device_identifier: partialDeviceId,
        limit: 100,
      } satisfies IErpHrmGuest.IRequest,
    },
  );
  typia.assert(filteredResponse);
  // 4. Validate response structure
  TestValidator.equals(
    "pagination structure",
    filteredResponse.pagination.current,
    allGuestsResponse.pagination.current,
  );
  // 5. Validate partial match behavior - all returned guests should have device_identifiers containing the partial string
  for (const guest of filteredResponse.data) {
    TestValidator.predicate(
      "guest device_identifier contains partial match",
      guest.device_identifier.includes(partialDeviceId),
    );
  }
  // 6. Validate total count is less than or equal to original
  TestValidator.predicate(
    "filtered count <= total count",
    filteredResponse.pagination.records <= allGuestsResponse.pagination.records,
  );
}
