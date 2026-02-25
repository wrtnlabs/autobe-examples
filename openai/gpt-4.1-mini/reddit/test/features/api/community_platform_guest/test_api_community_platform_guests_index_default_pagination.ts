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

export async function test_api_community_platform_guests_index_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // This test checks retrieval of guest users with default pagination and no filters.
  // Prepare connection (no authorization required as per spec: authorizationActor is null).
  const guestConnection: api.IConnection = { host: connection.host };
  // Prepare request body with no filters and no pagination params (defaults applied server-side)
  const body: ICommunityPlatformGuest.IRequest = {};
  // Call API
  const output: IPageICommunityPlatformGuest.ISummary =
    await api.functional.communityPlatform.guests.index(guestConnection, {
      body,
    });
  // Validate response type
  typia.assert(output);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is at least 1",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    output.pagination.limit > 0 && output.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records are non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    output.pagination.pages >= 0,
  );
  // Validate each guest record
  for (const guest of output.data) {
    typia.assert(guest);
    // Check id is valid UUID string
    TestValidator.predicate(
      `guest id ${guest.id} is a valid UUID`,
      typeof guest.id === "string" && /^[0-9a-fA-F-]{36}$/.test(guest.id),
    );
    // Check deviceFingerprint exists and is non-empty string
    TestValidator.predicate(
      `guest deviceFingerprint exists for guest ${guest.id}`,
      typeof guest.deviceFingerprint === "string" &&
        guest.deviceFingerprint.length > 0,
    );
    // Check createdAt and updatedAt are valid ISO date-time strings
    TestValidator.predicate(
      `guest createdAt is ISO date-time string for guest ${guest.id}`,
      typeof guest.createdAt === "string" &&
        !isNaN(Date.parse(guest.createdAt)),
    );
    TestValidator.predicate(
      `guest updatedAt is ISO date-time string for guest ${guest.id}`,
      typeof guest.updatedAt === "string" &&
        !isNaN(Date.parse(guest.updatedAt)),
    );
    // deletedAt is either null or ISO date-time string
    TestValidator.predicate(
      `guest deletedAt is null or ISO date-time string for guest ${guest.id}`,
      guest.deletedAt === null ||
        (typeof guest.deletedAt === "string" &&
          !isNaN(Date.parse(guest.deletedAt))),
    );
  }
}
