import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import type { IMallPlatformAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequestSnapshot";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformAdministratorApprovalRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_approval_requests_create } from "../../../generate/generate_random_mall_platform_customer_approval_requests_create";
import { prepare_random_mall_platform_administrator_approval_request } from "../../../prepare/prepare_random_mall_platform_administrator_approval_request";

export async function test_api_administrator_approval_request_snapshots_filter_by_request_and_time_range(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.Format<"password">>();
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const approvalRequest =
    await api.functional.mallPlatform.customer.approvalRequests.create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IMallPlatformAdministratorApprovalRequest.ICreate,
      },
    );
  typia.assert(approvalRequest);
  const rejectedRequest =
    await api.functional.mallPlatform.administrator.administratorApprovalRequests.reject(
      administratorConnection,
      {
        administratorApprovalRequestId: approvalRequest.id,
      },
    );
  typia.assert(rejectedRequest);
  const createdAt = new Date(approvalRequest.createdAt);
  const afterReview = new Date();
  const windowStart = new Date(createdAt.getTime() - 1000).toISOString();
  const windowEnd = new Date(afterReview.getTime() + 1000).toISOString();
  const page =
    await api.functional.mallPlatform.administrator.administratorApprovalRequestSnapshots.index(
      administratorConnection,
      {
        body: {
          administratorApprovalRequestId: approvalRequest.id,
          createdAtFrom: windowStart,
          createdAtTo: windowEnd,
          page: 1,
          limit: 20,
          sort: "-createdAt",
        } satisfies IMallPlatformAdministratorApprovalRequestSnapshot.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.equals("filtered page current", page.pagination.current, 1);
  TestValidator.equals("filtered page limit", page.pagination.limit, 20);
  TestValidator.predicate(
    "filtered page records non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "filtered page pages non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "all snapshots belong to the requested approval request",
    page.data.every(
      (snapshot) =>
        snapshot.administratorApprovalRequest.id === approvalRequest.id,
    ),
  );
  TestValidator.predicate(
    "all snapshots are within the requested time window",
    page.data.every(
      (snapshot) =>
        snapshot.createdAt >= windowStart && snapshot.createdAt <= windowEnd,
    ),
  );
  TestValidator.predicate(
    "snapshots are sorted newest first",
    page.data.every(
      (snapshot, index, array) =>
        index === 0 || array[index - 1].createdAt >= snapshot.createdAt,
    ),
  );
  if (page.data.length > 0) {
    TestValidator.equals(
      "first snapshot keeps parent request reference",
      page.data[0].administratorApprovalRequest.id,
      approvalRequest.id,
    );
  }
}
