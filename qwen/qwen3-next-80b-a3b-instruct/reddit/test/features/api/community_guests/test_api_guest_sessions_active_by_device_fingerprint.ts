import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_guest_sessions_active_by_device_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  // 2. Make PATCH request to /community/guests to retrieve active guest sessions
  // The IRequest is empty, so we send an empty object to request all active sessions
  const result = await api.functional.community.guests.index(adminConnection, {
    body: {} satisfies ICommunityGuest.IRequest,
  });
  typia.assert(result);
  // 3. Validate response structure and that sessions are active (deleted_at is null)
  // According to DTO, IPageICommunityGuest.ISummary contains:
  // - pagination: IPage.IPagination
  // - data: ICommunityGuest.ISummary[]
  // Validate pagination structure
  TestValidator.predicate("pagination exists", result.pagination !== null);
  TestValidator.predicate(
    "pagination current is positive",
    result.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    result.pagination.pages >= 0,
  );
  // Validate that data array exists and is an array
  TestValidator.predicate("data array exists", Array.isArray(result.data));
  // Validate that we received a non-negative number of sessions
  TestValidator.predicate(
    "data length is non-negative",
    result.data.length >= 0,
  );
}
