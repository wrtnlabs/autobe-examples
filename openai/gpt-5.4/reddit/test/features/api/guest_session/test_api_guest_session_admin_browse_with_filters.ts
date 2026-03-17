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

export async function test_api_guest_session_admin_browse_with_filters(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = {
    ...connection,
    host: connection.host,
    headers: connection.headers,
  };
  const request = {
    href: `https://example.com/${RandomGenerator.alphabets(8)}`,
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformGuestSession.IRequest;
  const first = await api.functional.communityPlatform.guestSessions.index(
    adminConnection,
    {
      body: request,
    },
  );
  typia.assert<IPageICommunityPlatformGuestSession.ISummary>(first);
  TestValidator.equals(
    "pagination current reflects request",
    first.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit reflects request",
    first.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    first.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    first.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page data is bounded by limit",
    first.data.length <= first.pagination.limit,
  );
  TestValidator.predicate(
    "pages are coherent with records",
    first.pagination.records === 0
      ? first.pagination.pages === 0
      : first.pagination.pages >= 1,
  );
  for (const item of first.data) {
    typia.assertEquals<ICommunityPlatformGuestSession.ISummary>(item);
    TestValidator.predicate(
      "guest summary exposes identity fields",
      item.guest.id.length > 0 && item.guest.guest_key.length > 0,
    );
    TestValidator.predicate(
      "raw foreign key is not exposed",
      !("community_platform_guest_id" in item),
    );
  }
  const second = await api.functional.communityPlatform.guestSessions.index(
    adminConnection,
    {
      body: request,
    },
  );
  typia.assert<IPageICommunityPlatformGuestSession.ISummary>(second);
  TestValidator.equals(
    "repeat browse keeps pagination current",
    second.pagination.current,
    first.pagination.current,
  );
  TestValidator.equals(
    "repeat browse keeps pagination limit",
    second.pagination.limit,
    first.pagination.limit,
  );
  if (first.data.length !== 0 && second.data.length !== 0) {
    TestValidator.equals(
      "repeat browse preserves first item id",
      second.data[0].id,
      first.data[0].id,
    );
  }
}
