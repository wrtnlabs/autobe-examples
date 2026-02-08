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

export async function test_api_guest_sessions_index_success_with_filters_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest join and authorize
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, { body: {} });
  typia.assert(guestAuth);
  // Update guestConnection with authorization token
  guestConnection.headers = {
    Authorization: `Bearer ${guestAuth.token.access}`,
  };
  // 2. Define plausible filter criteria and pagination parameters for session index
  // As the IRequest type has no detailed property in provided schemas,
  // we test with an empty object to get all sessions accessible to the guest.
  const filterBody: ICommunityPlatformUserSession.IRequest = {};
  // 3. Call the sessions index with filters and pagination
  const sessionPage =
    await api.functional.communityPlatform.guest.sessions.index(
      guestConnection,
      { body: filterBody },
    );
  typia.assert(sessionPage);
  // 4. Validate pagination and data
  TestValidator.predicate(
    "pagination current page must be >= 0",
    sessionPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit must be > 0",
    sessionPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages must be >= 0",
    sessionPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records must be >= 0",
    sessionPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "data length must be <= pagination limit",
    sessionPage.data.length <= sessionPage.pagination.limit,
  );
  // Note: We cannot assert specific userId, ip, or date ranges as IRequest is empty
  // but we confirm that the service returns valid session summaries matching schema
  sessionPage.data.forEach((session) => typia.assert(session));
}
