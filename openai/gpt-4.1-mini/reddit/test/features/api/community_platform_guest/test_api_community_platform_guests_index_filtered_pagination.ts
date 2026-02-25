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

export async function test_api_community_platform_guests_index_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Prepare admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Helper to call the guests index endpoint
  async function guestsIndex(
    filter: ICommunityPlatformGuest.IRequest,
  ): Promise<IPageICommunityPlatformGuest.ISummary> {
    const response = await api.functional.communityPlatform.guests.index(
      adminConnection,
      { body: filter },
    );
    typia.assert(response);
    return response;
  }
  // Create filter criteria with deviceFingerprint and date range
  // Use typia.random to generate plausible date-times and deviceFingerprints
  // For pagination test, vary page and limit
  // 1. Test filter by deviceFingerprint exact match
  const deviceFingerprintFilter = RandomGenerator.alphabets(15);
  const filter1: ICommunityPlatformGuest.IRequest = {
    deviceFingerprint: deviceFingerprintFilter,
    page: 1,
    limit: 20,
  };
  const result1 = await guestsIndex(filter1);
  TestValidator.predicate(
    "All guests match deviceFingerprint",
    result1.data.every(
      (guest) => guest.deviceFingerprint === deviceFingerprintFilter,
    ),
  );
  // 2. Test filter by creation date range
  const createdAtFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
    .toISOString();
  const createdAtTo = new Date().toISOString();
  const filter2: ICommunityPlatformGuest.IRequest = {
    createdAtFrom,
    createdAtTo,
    page: 1,
    limit: 20,
  };
  const result2 = await guestsIndex(filter2);
  TestValidator.predicate(
    "All guests created in date range",
    result2.data.every(
      (guest) =>
        guest.createdAt >= createdAtFrom && guest.createdAt < createdAtTo,
    ),
  );
  // 3. Test filter by deviceFingerprint and creation date range combined
  const filter3: ICommunityPlatformGuest.IRequest = {
    deviceFingerprint: deviceFingerprintFilter,
    createdAtFrom,
    createdAtTo,
    page: 1,
    limit: 20,
  };
  const result3 = await guestsIndex(filter3);
  TestValidator.predicate(
    "All guests match deviceFingerprint and date range",
    result3.data.every(
      (guest) =>
        guest.deviceFingerprint === deviceFingerprintFilter &&
        guest.createdAt >= createdAtFrom &&
        guest.createdAt < createdAtTo,
    ),
  );
  // 4. Test pagination obeys limits
  // Request small limit page 1
  const filter4: ICommunityPlatformGuest.IRequest = {
    page: 1,
    limit: 5,
  };
  const result4 = await guestsIndex(filter4);
  TestValidator.predicate(
    "Number of guests in page does not exceed limit",
    result4.data.length <= 5,
  );
  TestValidator.equals(
    "Pagination limit matches request",
    result4.pagination.limit,
    5,
  );
  // 5. Test page exceeding total pages returns empty data
  const filter5: ICommunityPlatformGuest.IRequest = {
    page: result4.pagination.pages + 100,
    limit: 5,
  };
  const result5 = await guestsIndex(filter5);
  TestValidator.equals(
    "Page exceeds total pages returns empty data",
    result5.data.length,
    0,
  );
  // 6. Validation of pagination counts
  if (result4.pagination.records === 0) {
    TestValidator.equals(
      "No records means zero pages",
      result4.pagination.pages,
      0,
    );
  } else {
    TestValidator.predicate(
      "Pages count is ceiling of records/limit",
      result4.pagination.pages === Math.ceil(result4.pagination.records / 5),
    );
  }
  // 7. Validate timestamps and data consistency for each guest in last page
  if (result4.pagination.pages > 0) {
    const lastPageFilter: ICommunityPlatformGuest.IRequest = {
      page: result4.pagination.pages,
      limit: 5,
    };
    const lastPageResult = await guestsIndex(lastPageFilter);
    lastPageResult.data.forEach((guest) => {
      // Validate uuid format for id
      TestValidator.predicate(
        `Valid UUID for guest id ${guest.id}`,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
          guest.id,
        ),
      );
      // Validate deviceFingerprint is non-empty string
      TestValidator.predicate(
        `Non-empty deviceFingerprint for guest id ${guest.id}`,
        typeof guest.deviceFingerprint === "string" &&
          guest.deviceFingerprint.length > 0,
      );
      // Validate createdAt, updatedAt are valid ISO date strings
      TestValidator.predicate(
        `Valid ISO date for createdAt guest id ${guest.id}`,
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(.+)?Z?$/.test(
          guest.createdAt,
        ),
      );
      TestValidator.predicate(
        `Valid ISO date for updatedAt guest id ${guest.id}`,
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(.+)?Z?$/.test(
          guest.updatedAt,
        ),
      );
      // deletedAt is either null or valid ISO date string
      TestValidator.predicate(
        `Valid ISO date or null for deletedAt guest id ${guest.id}`,
        guest.deletedAt === null ||
          /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(.+)?Z?$/.test(
            guest.deletedAt,
          ),
      );
      // Validate createdAt <= updatedAt
      TestValidator.predicate(
        `createdAt before or equals updatedAt for guest id ${guest.id}`,
        guest.createdAt <= guest.updatedAt,
      );
    });
  }
}
