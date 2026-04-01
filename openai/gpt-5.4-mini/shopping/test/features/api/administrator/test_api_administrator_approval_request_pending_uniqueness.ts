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

export async function test_api_administrator_approval_request_pending_uniqueness(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const request = {
    status: "pending",
    page: 1,
    limit: 100,
  } satisfies IMallPlatformAdministratorApprovalRequest.IRequest;
  const first: IPageIMallPlatformAdministratorApprovalRequest.ISummary =
    await api.functional.mallPlatform.administrator.administratorApprovalRequests.index(
      adminConnection,
      {
        body: request,
      },
    );
  typia.assert(first);
  const second: IPageIMallPlatformAdministratorApprovalRequest.ISummary =
    await api.functional.mallPlatform.administrator.administratorApprovalRequests.index(
      adminConnection,
      {
        body: request,
      },
    );
  typia.assert(second);
  TestValidator.equals(
    "pagination stable",
    first.pagination,
    second.pagination,
  );
  TestValidator.equals("request list stable", first.data, second.data);
  const firstStatusMap = new Map(
    first.data.map((item) => [item.id, item.status]),
  );
  const secondStatusMap = new Map(
    second.data.map((item) => [item.id, item.status]),
  );
  TestValidator.equals(
    "request statuses must remain stable by request id",
    Array.from(firstStatusMap.entries()),
    Array.from(secondStatusMap.entries()),
  );
  const pendingApplicants = first.data.filter(
    (item) => item.status === "pending",
  );
  const uniqueApplicantIds = new Set(
    pendingApplicants.map((item) => item.administrator.id),
  );
  TestValidator.equals(
    "pending approval requests should be unique per applicant on the returned page",
    uniqueApplicantIds.size,
    pendingApplicants.length,
  );
  for (const item of first.data) {
    TestValidator.predicate(
      "approval request status must remain a terminal or pending state",
      ["pending", "approved", "rejected"].includes(item.status),
    );
    if (item.status === "pending") {
      TestValidator.equals(
        "pending requests should not have reviewer",
        item.reviewerAdministrator,
        null,
      );
      TestValidator.equals(
        "pending requests should not have review timestamp",
        item.reviewedAt,
        null,
      );
      TestValidator.equals(
        "pending requests should not have rejection reason",
        item.rejectionReason,
        null,
      );
    }
  }
}
