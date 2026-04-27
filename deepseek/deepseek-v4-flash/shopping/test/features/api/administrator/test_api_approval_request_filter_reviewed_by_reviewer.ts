import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerApprovalRequest";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_approval_request_filter_reviewed_by_reviewer(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register an administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test_password_123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // Step 2: Call approval requests filter endpoint with status, reviewer email, and date range
  const now = new Date();
  const reviewedAtFrom = new Date(
    now.getTime() - 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const reviewedAtTo = now.toISOString();
  const reviewerEmailPrefix = admin.email.substring(
    0,
    admin.email.indexOf("@"),
  );
  const response =
    await api.functional.eCommerceMall.administrator.approval_requests.index(
      adminConnection,
      {
        body: {
          status: "approved",
          reviewer_email: reviewerEmailPrefix,
          reviewed_at_from: reviewedAtFrom,
          reviewed_at_to: reviewedAtTo,
          page: 1,
          limit: 10,
        } satisfies IECommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(response);
  // Step 3: Validate pagination metadata
  TestValidator.predicate(
    "pagination has valid metadata",
    () =>
      typeof response.pagination.current === "number" &&
      response.pagination.current >= 0 &&
      typeof response.pagination.limit === "number" &&
      response.pagination.limit >= 0 &&
      typeof response.pagination.records === "number" &&
      response.pagination.records >= 0 &&
      typeof response.pagination.pages === "number" &&
      response.pagination.pages >= 0,
  );
  // Step 4: If records exist, validate business rules
  if (response.data.length > 0) {
    for (const record of response.data) {
      TestValidator.equals("status is approved", record.status, "approved");
      TestValidator.predicate(
        "reviewer is not null for approved request",
        record.reviewer !== null,
      );
      TestValidator.equals(
        "rejection_reason is null for approved request",
        record.rejection_reason,
        null,
      );
      TestValidator.predicate(
        "reviewed_at is within the specified date range",
        record.reviewed_at !== null &&
          record.reviewed_at >= reviewedAtFrom &&
          record.reviewed_at <= reviewedAtTo,
      );
      TestValidator.predicate(
        "reviewer email matches search keyword",
        record.reviewer !== null &&
          record.reviewer.email
            .toLowerCase()
            .includes(reviewerEmailPrefix.toLowerCase()),
      );
    }
  }
}
