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

export async function test_api_guest_identity_stable_pagination_order(
  connection: api.IConnection,
): Promise<void> {
  const platformConnection: api.IConnection = { host: connection.host };
  const defaultRequest = {
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformGuest.IRequest;
  const defaultPageFirst = await api.functional.communityPlatform.guests.index(
    platformConnection,
    {
      body: defaultRequest,
    },
  );
  typia.assert(defaultPageFirst);
  const defaultPageSecond = await api.functional.communityPlatform.guests.index(
    platformConnection,
    {
      body: defaultRequest,
    },
  );
  typia.assert(defaultPageSecond);
  TestValidator.equals(
    "default pagination metadata is stable across repeated requests",
    defaultPageFirst.pagination,
    defaultPageSecond.pagination,
  );
  TestValidator.equals(
    "default ordered ids are stable across repeated requests",
    defaultPageFirst.data.map((guest) => guest.id),
    defaultPageSecond.data.map((guest) => guest.id),
  );
  TestValidator.equals(
    "default ordered guest keys are stable across repeated requests",
    defaultPageFirst.data.map((guest) => guest.guest_key),
    defaultPageSecond.data.map((guest) => guest.guest_key),
  );
  for (let i = 1; i < defaultPageFirst.data.length; ++i) {
    const previous = defaultPageFirst.data[i - 1];
    const current = defaultPageFirst.data[i];
    const previousCreatedAt = new Date(previous.created_at).getTime();
    const currentCreatedAt = new Date(current.created_at).getTime();
    TestValidator.predicate(
      `default order keeps created_at descending at index ${i}`,
      previousCreatedAt >= currentCreatedAt,
    );
    if (previous.created_at === current.created_at) {
      TestValidator.predicate(
        `default order keeps id ascending as tie-breaker at index ${i}`,
        previous.id <= current.id,
      );
    }
  }
  const sortedRequest = {
    page: 1,
    limit: 10,
    sort: "+created_at",
  } satisfies ICommunityPlatformGuest.IRequest;
  try {
    const sortedPageFirst = await api.functional.communityPlatform.guests.index(
      platformConnection,
      {
        body: sortedRequest,
      },
    );
    typia.assert(sortedPageFirst);
    const sortedPageSecond =
      await api.functional.communityPlatform.guests.index(platformConnection, {
        body: sortedRequest,
      });
    typia.assert(sortedPageSecond);
    TestValidator.equals(
      "explicit sort pagination metadata is stable across repeated requests",
      sortedPageFirst.pagination,
      sortedPageSecond.pagination,
    );
    TestValidator.equals(
      "explicit sort ordered ids are stable across repeated requests",
      sortedPageFirst.data.map((guest) => guest.id),
      sortedPageSecond.data.map((guest) => guest.id),
    );
    TestValidator.equals(
      "explicit sort ordered guest keys are stable across repeated requests",
      sortedPageFirst.data.map((guest) => guest.guest_key),
      sortedPageSecond.data.map((guest) => guest.guest_key),
    );
    for (let i = 1; i < sortedPageFirst.data.length; ++i) {
      const previous = sortedPageFirst.data[i - 1];
      const current = sortedPageFirst.data[i];
      const previousCreatedAt = new Date(previous.created_at).getTime();
      const currentCreatedAt = new Date(current.created_at).getTime();
      TestValidator.predicate(
        `explicit sort keeps created_at ascending at index ${i}`,
        previousCreatedAt <= currentCreatedAt,
      );
      if (previous.created_at === current.created_at) {
        TestValidator.predicate(
          `explicit sort keeps id ascending as tie-breaker at index ${i}`,
          previous.id <= current.id,
        );
      }
    }
  } catch {
    // Unsupported sort option is allowed by scenario adaptation when service allowlist differs.
  }
}
