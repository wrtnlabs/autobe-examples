import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallChannel";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_channel_listing_by_admin_with_status_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate as super admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // adminConnection.headers is now updated internally by authorize function
  // Step 2: Execute channel listing with status filter and date range
  const request: IShoppingMallChannel.IRequest = {
    page: 1,
    limit: 10,
    status: "approved",
    createdAfter: "2026-01-01T00:00:00Z",
    createdBefore: "2026-01-31T23:59:59Z",
  } satisfies IShoppingMallChannel.IRequest;
  const result: IPageIShoppingMallChannel.ISummary =
    await api.functional.shoppingMall.admin.channels.index(adminConnection, {
      body: request,
    });
  typia.assert(result);
  // Step 3: Validate structure and pagination
  TestValidator.equals(
    "response pagination current page correct",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "response pagination limit correct",
    result.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "response pagination records >= 0",
    () => result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "response pagination pages >= 0",
    () => result.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "response data is array",
    () => Array.isArray(result.data),
  );
  // Validate response structure per IPageIShoppingMallChannel.ISummary
  for (const channel of result.data) {
    TestValidator.equals("channel has ID", typeof channel.id, "string");
    TestValidator.predicate(
      "channel ID is UUID",
      () => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(channel.id),
    );
    TestValidator.equals("channel has name", typeof channel.name, "string");
    TestValidator.predicate(
      "channel name is not empty",
      () => channel.name.length > 0,
    );
    TestValidator.predicate(
      "channel name length <= 100",
      () => channel.name.length <= 100,
    );
    TestValidator.equals(
      "channel description is string or null",
      typeof channel.description,
      "string",
    );
    TestValidator.predicate(
      "description either null or not empty",
      () => channel.description === null || channel.description!.length > 0,
    );
  }
}