import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanAppeal";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_ban_appeal_search_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Perform paginated search with page=2 and limit=5
  const page2Request = {
    page: 2,
    limit: 5,
  } satisfies IDiscussionBoardBanAppeal.IRequest;
  const page2Response =
    await api.functional.discussionBoard.superAdmin.appeals.index(
      superAdminConnection,
      { body: page2Request },
    );
  typia.assert(page2Response);
  // 3. Perform search for page=1 with same limit for comparison
  const page1Request = {
    page: 1,
    limit: 5,
  } satisfies IDiscussionBoardBanAppeal.IRequest;
  const page1Response =
    await api.functional.discussionBoard.superAdmin.appeals.index(
      superAdminConnection,
      { body: page1Request },
    );
  typia.assert(page1Response);
  // 4. Validate pagination metadata for page 2
  TestValidator.equals(
    "current page should be 2",
    page2Response.pagination.pagination.pagination.pagination.current,
    2,
  );
  TestValidator.equals(
    "limit should match request",
    page2Response.pagination.pagination.pagination.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    page2Response.pagination.pagination.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be calculated correctly",
    page2Response.pagination.pagination.pagination.pagination.pages ===
      Math.ceil(
        page2Response.pagination.pagination.pagination.pagination.records /
          page2Response.pagination.pagination.pagination.pagination.limit,
      ),
  );
  // 5. Validate data array size
  TestValidator.predicate(
    "page 2 data array should not exceed limit",
    page2Response.data.length <= 5,
  );
  // 6. Validate no duplication between page 1 and page 2
  if (page1Response.data.length > 0 && page2Response.data.length > 0) {
    const page1Ids = new Set(page1Response.data.map((appeal) => appeal.id));
    const page2Ids = new Set(page2Response.data.map((appeal) => appeal.id));
    // Check that no IDs appear on both pages
    const intersection = [...page1Ids].filter((id) => page2Ids.has(id));
    TestValidator.equals(
      "page 1 and page 2 should have no overlapping IDs",
      intersection.length,
      0,
    );
  }
  // 7. Validate individual appeal structure
  for (const appeal of page2Response.data) {
    typia.assert(appeal);
    TestValidator.predicate(
      "appeal should have valid ID",
      appeal.id.length > 0,
    );
    TestValidator.predicate(
      "appeal should have reason",
      appeal.appeal_reason.length > 0,
    );
    TestValidator.predicate(
      "appeal should have valid status",
      ["pending", "under_review", "approved", "rejected"].includes(
        appeal.status,
      ),
    );
    TestValidator.predicate(
      "appeal should have valid appealed_at date",
      !isNaN(new Date(appeal.appealed_at).getTime()),
    );
    if (appeal.reviewed_at !== null) {
      TestValidator.predicate(
        "reviewed_at should be valid date if not null",
        !isNaN(new Date(appeal.reviewed_at).getTime()),
      );
    }
    typia.assert(appeal.user);
  }
}
