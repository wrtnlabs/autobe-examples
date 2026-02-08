import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_sessions_index_success_without_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest join first to authorize guest user
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, { body: {} });
  guestConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Call the guest sessions index endpoint without any filters (empty request body)
  const response: IPageICommunityPlatformUserSession.ISummary =
    await api.functional.communityPlatform.guest.sessions.index(
      guestConnection,
      {
        body: {},
      },
    );
  typia.assert(response);
  // 3. Verify pagination defaults
  TestValidator.predicate(
    "pagination current page is positive",
    response.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is positive or zero",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is positive or zero",
    response.pagination.records >= 0,
  );
  // 4. Verify data array exists and contains elements (or none but array)
  TestValidator.predicate(
    "response data is an array",
    Array.isArray(response.data),
  );
  // 5. For each session summary, typia.assert to ensure structure validity
  for (const session of response.data) {
    typia.assert(session);
  }
}
