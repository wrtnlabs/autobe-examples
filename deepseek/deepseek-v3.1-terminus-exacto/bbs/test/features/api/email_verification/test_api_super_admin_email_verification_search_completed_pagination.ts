import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSuperAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSuperAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuperAdminEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_email_verification_search_completed_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authentication as super administrator using SDK directly
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(authorized);
  // 2. Search for completed email verifications with small limit
  const limit = 5;
  const searchRequest: IDiscussionBoardSuperAdminEmailVerification.IRequest = {
    verification_status: "completed",
    limit,
    page: 1,
  };
  // 3. Get first page and validate pagination structure
  const firstPage =
    await api.functional.discussionBoard.superAdmin.super_admins.email_verifications.index(
      superAdminConnection,
      { body: searchRequest },
    );
  typia.assert(firstPage);
  // Validate first page pagination metadata
  // Type assertions to access correct pagination properties
  const firstPagePagination = firstPage.pagination as unknown as {
    current: number;
    limit: number;
    records: number;
    pages: number;
  };
  TestValidator.equals(
    "first page current should be 1",
    firstPagePagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit should match",
    firstPagePagination.limit,
    limit,
  );
  TestValidator.predicate(
    "total records should be >= 0",
    firstPagePagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be >= 0",
    firstPagePagination.pages >= 0,
  );
  // If there are multiple pages, test pagination across pages
  if (firstPagePagination.pages > 1) {
    let allRecords: IDiscussionBoardSuperAdminEmailVerification.ISummary[] = [
      ...firstPage.data,
    ];
    // Collect records from all subsequent pages
    for (let page = 2; page <= firstPagePagination.pages; page++) {
      const pageRequest: IDiscussionBoardSuperAdminEmailVerification.IRequest =
        {
          ...searchRequest,
          page,
        };
      const currentPage =
        await api.functional.discussionBoard.superAdmin.super_admins.email_verifications.index(
          superAdminConnection,
          { body: pageRequest },
        );
      typia.assert(currentPage);
      // Type assertion for current page pagination
      const currentPagePagination = currentPage.pagination as unknown as {
        current: number;
        limit: number;
        records: number;
        pages: number;
      };
      // Validate current page pagination
      TestValidator.equals(
        "current page matches request",
        currentPagePagination.current,
        page,
      );
      TestValidator.equals(
        "limit remains consistent",
        currentPagePagination.limit,
        limit,
      );
      TestValidator.equals(
        "total records consistent",
        currentPagePagination.records,
        firstPagePagination.records,
      );
      TestValidator.equals(
        "total pages consistent",
        currentPagePagination.pages,
        firstPagePagination.pages,
      );
      // Verify page size (except last page might have fewer records)
      if (page < firstPagePagination.pages) {
        TestValidator.equals(
          "page should contain limit records",
          currentPage.data.length,
          limit,
        );
      } else {
        TestValidator.predicate(
          "last page size <= limit",
          currentPage.data.length <= limit,
        );
      }
      allRecords.push(...currentPage.data);
    }
    // Validate overall distribution
    TestValidator.equals(
      "total collected records matches pagination total",
      allRecords.length,
      firstPagePagination.records,
    );
    // Check for duplicates using ID uniqueness
    const uniqueIds = new Set(allRecords.map((record) => record.id));
    TestValidator.equals(
      "no duplicate records across pages",
      uniqueIds.size,
      allRecords.length,
    );
    // Verify all records are completed status
    allRecords.forEach((record) => {
      TestValidator.equals(
        "record should be completed status",
        record.verification_status,
        "completed",
      );
    });
  } else if (firstPagePagination.pages === 1) {
    // Single page scenario validation
    TestValidator.equals(
      "single page should have correct record count",
      firstPage.data.length,
      firstPagePagination.records,
    );
    TestValidator.equals(
      "single page total pages should be 1",
      firstPagePagination.pages,
      1,
    );
    // Verify all records are completed status
    firstPage.data.forEach((record) => {
      TestValidator.equals(
        "record should be completed status",
        record.verification_status,
        "completed",
      );
    });
  }
  // Final validation: pages calculation should be correct
  const expectedPages =
    firstPagePagination.records === 0
      ? 0
      : Math.ceil(firstPagePagination.records / limit);
  TestValidator.equals(
    "total pages calculation is correct",
    firstPagePagination.pages,
    expectedPages,
  );
}