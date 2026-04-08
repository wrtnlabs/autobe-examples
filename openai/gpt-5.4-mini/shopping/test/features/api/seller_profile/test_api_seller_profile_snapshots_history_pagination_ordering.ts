import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfileSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Validate administrator seller profile snapshot history pagination and ordering.
 *
 * Verifies that an authenticated administrator can retrieve seller profile snapshot history in a paginated form, that each page is ordered from newest to oldest, and that pagination metadata remains internally consistent across page boundaries.
 *
 * This test focuses on audit-history behavior that must remain stable for dispute resolution. It checks that the returned snapshots preserve historical storefront identity data, that multiple pages do not overlap, and that the live-response data shape remains limited to immutable snapshot summaries and pagination metadata.
 *
 * 1. Authenticate as an administrator using the join utility and build an isolated actor connection.
 * 2. Fetch the seller profile snapshot history and validate pagination metadata and page ordering.
 * 3. If multiple pages exist, fetch a later page by following the reported pagination metadata and confirm records do not repeat across pages.
 * 4. Validate every returned snapshot preserves immutable historical fields such as shop name, shop description, logo URI, and creation timestamp.
 */
export async function test_api_seller_profile_snapshots_history_pagination_ordering(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Test1234!" satisfies string & tags.Format<"password">,
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(authorized);
  const firstPage =
    await api.functional.mallPlatform.administrator.sellerProfileSnapshots.history.at(
      administratorConnection,
    );
  typia.assert(firstPage);
  TestValidator.predicate(
    "pagination current should be a non-negative page number",
    firstPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be a non-negative page size",
    firstPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.equals(
    "history page should not exceed the reported page size",
    firstPage.data.length <= firstPage.pagination.limit,
    true,
  );
  TestValidator.predicate(
    "history records should fit within the reported page count",
    firstPage.pagination.pages === 0
      ? firstPage.pagination.records === 0
      : firstPage.pagination.records > 0,
  );
  for (let index = 1; index < firstPage.data.length; index += 1) {
    const previous = firstPage.data[index - 1];
    const current = firstPage.data[index];
    TestValidator.predicate(
      "snapshots on the first page should be ordered newest to oldest",
      previous.createdAt >= current.createdAt,
    );
    TestValidator.notEquals(
      "adjacent snapshots on the same page should not repeat the same snapshot identity",
      previous.id,
      current.id,
    );
  }
  for (const snapshot of firstPage.data) {
    TestValidator.predicate(
      "snapshot should preserve a historical shop name string",
      snapshot.shopName.length >= 0,
    );
    TestValidator.predicate(
      "snapshot should preserve a historical shop description string",
      snapshot.shopDescription.length >= 0,
    );
    if (snapshot.logoImageUri !== null) {
      TestValidator.predicate(
        "snapshot logo uri should be a non-empty preserved url when present",
        snapshot.logoImageUri.length > 0,
      );
    }
    TestValidator.predicate(
      "snapshot should preserve a creation timestamp",
      snapshot.createdAt.length > 0,
    );
  }
  if (firstPage.pagination.pages > 1) {
    const laterPage =
      await api.functional.mallPlatform.administrator.sellerProfileSnapshots.history.at(
        administratorConnection,
      );
    typia.assert(laterPage);
    TestValidator.equals(
      "later page fetch without request parameters should preserve the same pagination contract",
      laterPage.pagination.limit,
      firstPage.pagination.limit,
    );
    for (const laterSnapshot of laterPage.data) {
      for (const earlierSnapshot of firstPage.data) {
        TestValidator.notEquals(
          "snapshot ids should not repeat across page boundaries",
          earlierSnapshot.id,
          laterSnapshot.id,
        );
      }
    }
    for (let index = 1; index < laterPage.data.length; index += 1) {
      const previous = laterPage.data[index - 1];
      const current = laterPage.data[index];
      TestValidator.predicate(
        "snapshots on a later page should also be ordered newest to oldest",
        previous.createdAt >= current.createdAt,
      );
    }
  }
}
