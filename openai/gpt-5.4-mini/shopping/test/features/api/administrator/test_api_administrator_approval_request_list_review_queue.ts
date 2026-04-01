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

export async function test_api_administrator_approval_request_list_review_queue(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin-${typia.random<string & tags.Format<"email">>()}`,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const defaultPage =
    await api.functional.mallPlatform.administrator.administratorApprovalRequests.index(
      adminConnection,
      {
        body: {
          limit: 10,
          page: 1,
        } satisfies IMallPlatformAdministratorApprovalRequest.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.predicate(
    "default page has pagination metadata",
    defaultPage.pagination.current === 1 &&
      defaultPage.pagination.limit === 10 &&
      defaultPage.pagination.records >= 0 &&
      defaultPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "default page data is an array",
    Array.isArray(defaultPage.data),
  );
  if (defaultPage.data.length > 0) {
    const first = defaultPage.data[0];
    TestValidator.predicate(
      "summary includes applicant administrator",
      typeof first.administrator.id === "string" &&
        typeof first.administrator.email === "string" &&
        typeof first.administrator.grade === "string" &&
        typeof first.administrator.status === "string",
    );
    TestValidator.predicate(
      "summary includes optional reviewer administrator or null",
      first.reviewerAdministrator === null ||
        (typeof first.reviewerAdministrator.id === "string" &&
          typeof first.reviewerAdministrator.email === "string"),
    );
    TestValidator.predicate(
      "summary includes review timestamps and decisions",
      typeof first.reason === "string" &&
        typeof first.status === "string" &&
        (first.rejectionReason === null ||
          typeof first.rejectionReason === "string") &&
        (first.reviewedAt === null || typeof first.reviewedAt === "string"),
    );
  }
  const pendingPage =
    await api.functional.mallPlatform.administrator.administratorApprovalRequests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          limit: 10,
          page: 1,
        } satisfies IMallPlatformAdministratorApprovalRequest.IRequest,
      },
    );
  typia.assert(pendingPage);
  TestValidator.predicate(
    "pending filter returns only pending requests",
    pendingPage.data.every((request) => request.status === "pending"),
  );
  const searchReason = "governance review";
  const searchedPage =
    await api.functional.mallPlatform.administrator.administratorApprovalRequests.index(
      adminConnection,
      {
        body: {
          search: searchReason,
          limit: 10,
          page: 1,
        } satisfies IMallPlatformAdministratorApprovalRequest.IRequest,
      },
    );
  typia.assert(searchedPage);
  TestValidator.predicate(
    "search result respects reason text filter",
    searchedPage.data.every((request) =>
      request.reason.toLowerCase().includes(searchReason.toLowerCase()),
    ),
  );
  const pageOne =
    await api.functional.mallPlatform.administrator.administratorApprovalRequests.index(
      adminConnection,
      {
        body: {
          sort: "createdAt",
          order: "desc",
          limit: 5,
          page: 1,
        } satisfies IMallPlatformAdministratorApprovalRequest.IRequest,
      },
    );
  typia.assert(pageOne);
  TestValidator.predicate(
    "page one pagination metadata is correct",
    pageOne.pagination.current === 1 && pageOne.pagination.limit === 5,
  );
  const pageTwo =
    await api.functional.mallPlatform.administrator.administratorApprovalRequests.index(
      adminConnection,
      {
        body: {
          sort: "createdAt",
          order: "desc",
          limit: 5,
          page: 2,
        } satisfies IMallPlatformAdministratorApprovalRequest.IRequest,
      },
    );
  typia.assert(pageTwo);
  TestValidator.predicate(
    "page two pagination metadata is correct",
    pageTwo.pagination.current === 2 && pageTwo.pagination.limit === 5,
  );
  const reviewedRequests = [
    ...defaultPage.data,
    ...pendingPage.data,
    ...searchedPage.data,
    ...pageOne.data,
    ...pageTwo.data,
  ].filter(
    (request) => request.status === "approved" || request.status === "rejected",
  );
  TestValidator.predicate(
    "reviewed requests preserve final state and audit fields",
    reviewedRequests.every((request) =>
      request.status === "approved"
        ? request.reviewedAt !== null
        : request.status === "rejected"
          ? request.reviewedAt !== null && request.rejectionReason !== null
          : true,
    ),
  );
}
