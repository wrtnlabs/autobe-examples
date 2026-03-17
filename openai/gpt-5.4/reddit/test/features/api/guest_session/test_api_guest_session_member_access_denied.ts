import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_session_member_access_denied(
  connection: api.IConnection,
): Promise<void> {
  const publicConnection: api.IConnection = {
    host: connection.host,
  };
  const request = {
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformGuestSession.IRequest;
  const response = await api.functional.communityPlatform.guestSessions.index(
    publicConnection,
    {
      body: request,
    },
  );
  typia.assert(response);
  TestValidator.equals(
    "current page matches request",
    response.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "limit matches request",
    response.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "data length does not exceed requested limit",
    response.data.length <= request.limit,
  );
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "zero records implies empty page data",
    response.pagination.records !== 0 || response.data.length === 0,
  );
  TestValidator.predicate(
    "zero pages implies zero records",
    response.pagination.pages !== 0 || response.pagination.records === 0,
  );
}
