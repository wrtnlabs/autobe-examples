import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_shipment_administrator_empty_result_page(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const request = {
    page: 1,
    limit: 10,
    search: `no-shipment-${RandomGenerator.alphabets(12)}`,
  } satisfies IMallPlatformShipment.IRequest;
  const first = await api.functional.mallPlatform.administrator.shipments.index(
    administratorConnection,
    { body: request },
  );
  typia.assert(first);
  TestValidator.equals("empty page records", first.pagination.records, 0);
  TestValidator.equals("empty page pages", first.pagination.pages, 0);
  TestValidator.equals("empty page current", first.pagination.current, 1);
  TestValidator.equals("empty page limit", first.pagination.limit, 10);
  TestValidator.equals("empty page data length", first.data.length, 0);
  const second =
    await api.functional.mallPlatform.administrator.shipments.index(
      administratorConnection,
      { body: request },
    );
  typia.assert(second);
  TestValidator.equals(
    "repeated empty page records",
    second.pagination.records,
    0,
  );
  TestValidator.equals("repeated empty page pages", second.pagination.pages, 0);
  TestValidator.equals(
    "repeated empty page current",
    second.pagination.current,
    1,
  );
  TestValidator.equals(
    "repeated empty page limit",
    second.pagination.limit,
    10,
  );
  TestValidator.equals(
    "repeated empty page data length",
    second.data.length,
    0,
  );
}
