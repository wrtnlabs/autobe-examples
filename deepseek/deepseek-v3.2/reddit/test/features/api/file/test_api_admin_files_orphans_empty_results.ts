import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_files_orphans_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection using authorize_admin_join utility
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_admin_join(adminConnection, {});
  typia.assert(authorizedAdmin);
  adminConnection.headers = { Authorization: authorizedAdmin.token.access };
  // Test 1: Search with file type filter that excludes all existing files
  // All files created by tests are images, so filter for PDF should yield zero results
  const pdfSearch =
    await api.functional.communityPlatform.admin.files.orphans.index(
      adminConnection,
      {
        body: {
          type: "application/pdf",
        } satisfies ICommunityPlatformFile.IRequest,
      },
    );
  typia.assert(pdfSearch);
  TestValidator.equals(
    "PDF type filter returns empty results",
    pdfSearch.data,
    [],
  );
  TestValidator.equals(
    "Total records for PDF search is zero",
    pdfSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "Total pages for PDF search is zero",
    pdfSearch.pagination.pages,
    0,
  );
  // Test 2: Search with size range too small
  // All files are larger than 100 bytes (images), so 0-100 byte range yields zero results
  const smallSizeSearch =
    await api.functional.communityPlatform.admin.files.orphans.index(
      adminConnection,
      {
        body: {
          size_min: 0,
          size_max: 100,
        } satisfies ICommunityPlatformFile.IRequest,
      },
    );
  typia.assert(smallSizeSearch);
  TestValidator.equals(
    "Small size filter returns empty results",
    smallSizeSearch.data,
    [],
  );
  TestValidator.equals(
    "Total records for small size search is zero",
    smallSizeSearch.pagination.records,
    0,
  );
  // Test 3: Search with upload date far in the future
  // No files exist after a future date
  const futureDate = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const futureSearch =
    await api.functional.communityPlatform.admin.files.orphans.index(
      adminConnection,
      {
        body: {
          created_at_start: futureDate,
        } satisfies ICommunityPlatformFile.IRequest,
      },
    );
  typia.assert(futureSearch);
  TestValidator.equals(
    "Future date filter returns empty results",
    futureSearch.data,
    [],
  );
  TestValidator.equals(
    "Total records for future date search is zero",
    futureSearch.pagination.records,
    0,
  );
  // Test 4: Combined restrictive filters that exclude all files
  const combinedSearch =
    await api.functional.communityPlatform.admin.files.orphans.index(
      adminConnection,
      {
        body: {
          type: "application/pdf",
          size_min: 1000000, // 1 MB
          actor_type: "member",
          status: "failed",
        } satisfies ICommunityPlatformFile.IRequest,
      },
    );
  typia.assert(combinedSearch);
  TestValidator.equals(
    "Combined restrictive filters return empty results",
    combinedSearch.data,
    [],
  );
  TestValidator.equals(
    "Total records for combined search is zero",
    combinedSearch.pagination.records,
    0,
  );
  // Validate pagination metadata for empty results
  // When records = 0, pages should be 0, limit should be default or provided
  TestValidator.predicate(
    "Empty search results have zero pages",
    pdfSearch.pagination.pages === 0 &&
      smallSizeSearch.pagination.pages === 0 &&
      futureSearch.pagination.pages === 0 &&
      combinedSearch.pagination.pages === 0,
  );
  TestValidator.predicate(
    "Pagination current page is valid",
    pdfSearch.pagination.current >= 0 &&
      smallSizeSearch.pagination.current >= 0 &&
      futureSearch.pagination.current >= 0 &&
      combinedSearch.pagination.current >= 0,
  );
}
