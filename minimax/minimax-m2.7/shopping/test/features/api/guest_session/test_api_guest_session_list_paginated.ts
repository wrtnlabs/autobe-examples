import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import type { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_session_list_paginated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Call endpoint with default pagination (empty body)
  const defaultPage = await api.functional.ecommerceMall.guest_sessions.index(
    connection,
    {
      body: {} satisfies IEcommerceMallGuestSession.IRequest,
    },
  );
  typia.assert(defaultPage);
  // Extract the nested pagination object for cleaner access
  const pagination = defaultPage.pagination.pagination;
  // 2. Validate pagination metadata
  TestValidator.equals("default limit is 20", pagination.limit, 20);
  TestValidator.predicate("records is non-negative", pagination.records >= 0);
  TestValidator.predicate("pages is non-negative", pagination.pages >= 0);
  TestValidator.equals("current page is 1", pagination.current, 1);
  // 3. Validate data array exists
  TestValidator.equals("data is array", Array.isArray(defaultPage.data), true);
  // 4. Validate session item structure for each item
  for (const session of defaultPage.data) {
    typia.assert(session);
    TestValidator.predicate("session has valid id", !!session.id);
    TestValidator.predicate("session has valid ip", !!session.ip);
    TestValidator.predicate("session has valid href", !!session.href);
    TestValidator.predicate("session has valid referrer", !!session.referrer);
    TestValidator.predicate("session has valid createdAt", !!session.createdAt);
    TestValidator.predicate("session has valid expiredAt", !!session.expiredAt);
    TestValidator.predicate("session has valid guest", !!session.guest);
    TestValidator.predicate("guest has valid id", !!session.guest.id);
    TestValidator.predicate(
      "guest has valid fingerprint",
      !!session.guest.fingerprint,
    );
    TestValidator.predicate(
      "guest userAgent is string or null",
      typeof session.guest.userAgent === "string" ||
        session.guest.userAgent === null,
    );
  }
  // 5. Verify ordering by createdAt descending (if more than 1 record)
  if (defaultPage.data.length > 1) {
    for (let i = 0; i < defaultPage.data.length - 1; i++) {
      const current = new Date(defaultPage.data[i].createdAt).getTime();
      const next = new Date(defaultPage.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        "sessions ordered by createdAt descending",
        current >= next,
      );
    }
  }
  // 6. Test pagination with explicit page parameter
  if (pagination.pages > 1) {
    const secondPage = await api.functional.ecommerceMall.guest_sessions.index(
      connection,
      {
        body: {
          page: 2,
        } satisfies IEcommerceMallGuestSession.IRequest,
      },
    );
    typia.assert(secondPage);
    const secondPagination = secondPage.pagination.pagination;
    TestValidator.equals(
      "second page current is 2",
      secondPagination.current,
      2,
    );
    TestValidator.equals("second page limit is 20", secondPagination.limit, 20);
  }
  // 7. Test pagination with custom limit
  const customLimitPage =
    await api.functional.ecommerceMall.guest_sessions.index(connection, {
      body: {
        limit: 5,
      } satisfies IEcommerceMallGuestSession.IRequest,
    });
  typia.assert(customLimitPage);
  TestValidator.equals(
    "custom limit is 5",
    customLimitPage.pagination.pagination.limit,
    5,
  );
}
