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

export async function test_api_administrator_approval_request_snapshots_browse_history(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://mall.example.com/register",
      referrer: "https://mall.example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const request =
    await generate_random_mall_platform_customer_approval_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IMallPlatformAdministratorApprovalRequest.ICreate,
      },
    );
  typia.assert(request);
  const approved =
    await api.functional.mallPlatform.administrator.administratorApprovalRequests.approve.create(
      adminConnection,
      {
        administratorApprovalRequestId: request.id,
      },
    );
  typia.assert(approved);
  const page =
    await api.functional.mallPlatform.administrator.administratorApprovalRequestSnapshots.index(
      adminConnection,
      {
        body: {
          administratorApprovalRequestId: request.id,
          page: 1,
          limit: 10,
        } satisfies IMallPlatformAdministratorApprovalRequestSnapshot.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "snapshot pagination current page",
    page.pagination.current,
    1,
  );
  TestValidator.equals("snapshot pagination limit", page.pagination.limit, 10);
  TestValidator.equals(
    "snapshot pagination records",
    page.pagination.records,
    page.data.length,
  );
  TestValidator.predicate(
    "snapshot pagination pages is non-negative",
    page.pagination.pages >= 0,
  );
  let previousCreatedAt: string | null = null;
  for (const snapshot of page.data) {
    typia.assert(snapshot);
    TestValidator.equals(
      "snapshot request id matches source request",
      snapshot.administratorApprovalRequest.id,
      request.id,
    );
    TestValidator.equals(
      "snapshot reason preserves approval request reason",
      snapshot.administratorApprovalRequest.reason,
      request.reason,
    );
    TestValidator.predicate(
      "snapshot reason is present",
      snapshot.snapshotReason.length > 0,
    );
    TestValidator.predicate(
      "snapshot createdAt is present",
      snapshot.createdAt.length > 0,
    );
    if (previousCreatedAt !== null) {
      TestValidator.predicate(
        "snapshot list is ordered newest first",
        previousCreatedAt >= snapshot.createdAt,
      );
    }
    previousCreatedAt = snapshot.createdAt;
  }
  const reread =
    await api.functional.mallPlatform.administrator.administratorApprovalRequestSnapshots.index(
      adminConnection,
      {
        body: {
          administratorApprovalRequestId: request.id,
          page: 1,
          limit: 10,
        } satisfies IMallPlatformAdministratorApprovalRequestSnapshot.IRequest,
      },
    );
  typia.assert(reread);
  TestValidator.equals(
    "snapshot browse is read-only on data",
    reread.data,
    page.data,
  );
  TestValidator.equals(
    "snapshot browse is read-only on pagination",
    reread.pagination,
    page.pagination,
  );
}
