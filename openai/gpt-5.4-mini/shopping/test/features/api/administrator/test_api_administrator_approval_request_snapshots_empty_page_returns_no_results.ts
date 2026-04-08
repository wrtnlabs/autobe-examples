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

export async function test_api_administrator_approval_request_snapshots_empty_page_returns_no_results(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123!" satisfies string & tags.Format<"password">,
      href: "https://example.com/signup",
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
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123!" satisfies string & tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const approvedRequest =
    await api.functional.mallPlatform.administrator.administratorApprovalRequests.approve.create(
      administratorConnection,
      {
        administratorApprovalRequestId: approvalRequest.id,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "approval request identity remains the same after approval",
    approvedRequest.id,
    approvalRequest.id,
  );
  TestValidator.equals(
    "approval request reason remains the same after approval",
    approvedRequest.reason,
    approvalRequest.reason,
  );
  TestValidator.predicate(
    "approval request is resolved",
    approvedRequest.status === "approved" ||
      approvedRequest.status === "rejected",
  );
  const emptyPage =
    await api.functional.mallPlatform.administrator.administratorApprovalRequestSnapshots.index(
      administratorConnection,
      {
        body: {
          administratorApprovalRequestId: approvalRequest.id,
          page: 2,
          limit: 1,
        } satisfies IMallPlatformAdministratorApprovalRequestSnapshot.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals("empty page data", emptyPage.data, []);
  TestValidator.equals("current page", emptyPage.pagination.current, 2);
  TestValidator.equals("page size", emptyPage.pagination.limit, 1);
  TestValidator.equals("total records", emptyPage.pagination.records, 1);
  TestValidator.equals("total pages", emptyPage.pagination.pages, 1);
}
