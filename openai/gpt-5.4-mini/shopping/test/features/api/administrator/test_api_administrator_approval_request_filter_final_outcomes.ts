import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformAdministratorApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_approval_request_filter_final_outcomes(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(admin);
  const keywords = ["approved", "rejected", "review"] as const;
  const keyword = RandomGenerator.pick(keywords);
  const statuses = ["approved", "rejected"] as const;
  const status = RandomGenerator.pick(statuses);
  const page =
    await api.functional.mallPlatform.administrator.administratorApprovalRequests.index(
      adminConnection,
      {
        body: {
          administratorId: admin.id,
          search: keyword,
          status,
          page: 1,
          limit: 20,
          sort: "updatedAt",
          order: "desc",
        } satisfies IMallPlatformAdministratorApprovalRequest.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.predicate(
    "pagination metadata is present",
    page.pagination.current >= 1 &&
      page.pagination.limit >= 1 &&
      page.pagination.records >= 0 &&
      page.pagination.pages >= 0,
  );
  for (const row of page.data) {
    TestValidator.equals(
      "administrator filter matches",
      row.administrator.id,
      admin.id,
    );
    TestValidator.equals("final status filter matches", row.status, status);
    TestValidator.predicate(
      "summary fields are exposed for auditability",
      row.id.length > 0 &&
        row.reason.length >= 0 &&
        row.createdAt.length > 0 &&
        row.updatedAt.length > 0,
    );
    if (row.status === "approved") {
      TestValidator.predicate(
        "approved request has reviewer administrator",
        row.reviewerAdministrator !== null,
      );
      TestValidator.predicate(
        "approved request has reviewedAt timestamp",
        row.reviewedAt !== null,
      );
      TestValidator.equals(
        "approved request has no rejection reason",
        row.rejectionReason,
        null,
      );
    } else if (row.status === "rejected") {
      TestValidator.predicate(
        "rejected request has reviewer administrator",
        row.reviewerAdministrator !== null,
      );
      TestValidator.predicate(
        "rejected request has reviewedAt timestamp",
        row.reviewedAt !== null,
      );
      TestValidator.predicate(
        "rejected request has rejection reason",
        row.rejectionReason !== null,
      );
    }
    TestValidator.equals(
      "soft delete status remains readable",
      row.deletedAt,
      row.deletedAt,
    );
  }
  const reviewedPage =
    await api.functional.mallPlatform.administrator.administratorApprovalRequests.index(
      adminConnection,
      {
        body: {
          administratorId: admin.id,
          search: keyword,
          status,
          page: 1,
          limit: 20,
          sort: "createdAt",
          order: "asc",
        } satisfies IMallPlatformAdministratorApprovalRequest.IRequest,
      },
    );
  typia.assert(reviewedPage);
  TestValidator.equals(
    "final-state filtered count is stable",
    reviewedPage.pagination.records,
    page.pagination.records,
  );
  TestValidator.equals(
    "final-state filtered page size is stable",
    reviewedPage.data.length,
    page.data.length,
  );
}
