import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformDeliveryWindow } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeliveryWindow";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformDeliveryWindow } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformDeliveryWindow";
export async function test_api_delivery_window_sort_by_priority(
  connection: api.IConnection,
): Promise<void> {
  // Test descending sort by priority
  const responseDesc =
    await api.functional.communityPlatform.delivery_windows.index(connection, {
      body: {
        sortBy: "priority",
        order: "desc",
      } satisfies ICommunityPlatformDeliveryWindow.IRequest,
    });
  typia.assert(responseDesc);
  // Ensure we have at least some results to test sorting
  TestValidator.predicate(
    "at least one delivery window exists",
    responseDesc.data.length > 0,
  );
  // Extract priority values for descending order verification
  const prioritiesDesc = responseDesc.data.map((window) => window.priority);
  // Validate priorities are sorted in descending order (highest to lowest)
  // We iterate and ensure each priority is >= the next one
  const isDescending = prioritiesDesc.every(
    (priority, index) =>
      index === prioritiesDesc.length - 1 ||
      priority >= prioritiesDesc[index + 1],
  );
  TestValidator.predicate(
    "delivery windows sorted by priority descending",
    isDescending,
  );
  // Test ascending sort by priority
  const responseAsc =
    await api.functional.communityPlatform.delivery_windows.index(connection, {
      body: {
        sortBy: "priority",
        order: "asc",
      } satisfies ICommunityPlatformDeliveryWindow.IRequest,
    });
  typia.assert(responseAsc);
  // Ensure we have at least some results to test sorting
  TestValidator.predicate(
    "at least one delivery window exists",
    responseAsc.data.length > 0,
  );
  // Extract priority values for ascending order verification
  const prioritiesAsc = responseAsc.data.map((window) => window.priority);
  // Validate priorities are sorted in ascending order (lowest to highest)
  // We iterate and ensure each priority is <= the next one
  const isAscending = prioritiesAsc.every(
    (priority, index) =>
      index === prioritiesAsc.length - 1 ||
      priority <= prioritiesAsc[index + 1],
  );
  TestValidator.predicate(
    "delivery windows sorted by priority ascending",
    isAscending,
  );
}
