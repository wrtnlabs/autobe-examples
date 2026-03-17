import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_identity_lifecycle_filtering(
  connection: api.IConnection,
): Promise<void> {
  const inspectorConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const page = 1;
  const limit = 10;
  const guestKeyFilter = `guest-${RandomGenerator.alphaNumeric(8)}`;
  const retiredAtFilter = new Date().toISOString();
  const expectedKeys = [
    "created_at",
    "deleted_at",
    "guest_key",
    "id",
    "updated_at",
  ];
  const assertGuestSummary = (
    guest: ICommunityPlatformGuest.ISummary,
  ): void => {
    typia.assert(guest);
    TestValidator.equals(
      "guest summary exposes only guest actor fields",
      Object.keys(guest).sort(),
      expectedKeys,
    );
  };
  const byGuestKey = await api.functional.communityPlatform.guests.index(
    inspectorConnection,
    {
      body: {
        page,
        limit,
        guest_key: guestKeyFilter,
      } satisfies ICommunityPlatformGuest.IRequest,
    },
  );
  typia.assert(byGuestKey);
  TestValidator.equals(
    "guest key page echoes request",
    byGuestKey.pagination.current,
    page,
  );
  TestValidator.predicate(
    "guest key page size stays within limit",
    byGuestKey.data.length <= byGuestKey.pagination.limit,
  );
  TestValidator.predicate(
    "guest key pagination records cover current data",
    byGuestKey.pagination.records >= byGuestKey.data.length,
  );
  TestValidator.predicate(
    "guest key pagination pages are non-negative",
    byGuestKey.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "guest key pagination limit is within request bound",
    byGuestKey.pagination.limit <= limit,
  );
  for (const guest of byGuestKey.data) {
    assertGuestSummary(guest);
    TestValidator.predicate(
      "guest key filtering matches requested guest key",
      guest.guest_key === guestKeyFilter ||
        guest.guest_key.includes(guestKeyFilter),
    );
  }
  const activeOnly = await api.functional.communityPlatform.guests.index(
    inspectorConnection,
    {
      body: {
        page,
        limit,
        deleted_at: null,
      } satisfies ICommunityPlatformGuest.IRequest,
    },
  );
  typia.assert(activeOnly);
  TestValidator.equals(
    "active page echoes request",
    activeOnly.pagination.current,
    page,
  );
  TestValidator.predicate(
    "active page size stays within limit",
    activeOnly.data.length <= activeOnly.pagination.limit,
  );
  TestValidator.predicate(
    "active pagination records cover current data",
    activeOnly.pagination.records >= activeOnly.data.length,
  );
  TestValidator.predicate(
    "active pagination pages are non-negative",
    activeOnly.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "active pagination limit is within request bound",
    activeOnly.pagination.limit <= limit,
  );
  for (const guest of activeOnly.data) {
    assertGuestSummary(guest);
    TestValidator.equals(
      "active guests are not retired",
      guest.deleted_at,
      null,
    );
  }
  const retiredOnly = await api.functional.communityPlatform.guests.index(
    inspectorConnection,
    {
      body: {
        page,
        limit,
        deleted_at: retiredAtFilter,
      } satisfies ICommunityPlatformGuest.IRequest,
    },
  );
  typia.assert(retiredOnly);
  TestValidator.equals(
    "retired page echoes request",
    retiredOnly.pagination.current,
    page,
  );
  TestValidator.predicate(
    "retired page size stays within limit",
    retiredOnly.data.length <= retiredOnly.pagination.limit,
  );
  TestValidator.predicate(
    "retired pagination records cover current data",
    retiredOnly.pagination.records >= retiredOnly.data.length,
  );
  TestValidator.predicate(
    "retired pagination pages are non-negative",
    retiredOnly.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "retired pagination limit is within request bound",
    retiredOnly.pagination.limit <= limit,
  );
  for (const guest of retiredOnly.data) {
    assertGuestSummary(guest);
    TestValidator.predicate(
      "retired guests have retirement timestamp",
      guest.deleted_at !== null,
    );
  }
}
