import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import type { IMallPlatformAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequestSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_approval_requests_create } from "../../../generate/generate_random_mall_platform_seller_approval_requests_create";
import { prepare_random_mall_platform_administrator_approval_request } from "../../../prepare/prepare_random_mall_platform_administrator_approval_request";

export async function test_api_administrator_approval_request_snapshot_history_list(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(administratorConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.ILogin,
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const approvalRequest =
    await generate_random_mall_platform_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IMallPlatformAdministratorApprovalRequest.ICreate,
      },
    );
  typia.assert(approvalRequest);
  const expectedRequest = JSON.parse(
    JSON.stringify(approvalRequest),
  ) as IMallPlatformAdministratorApprovalRequest;
  const requestId = approvalRequest.id;
  const request: IMallPlatformAdministratorApprovalRequestSnapshot.IRequest = {
    page: 1,
    limit: 20,
    sort: "-createdAt",
  };
  const firstPage =
    await api.functional.mallPlatform.administrator.administratorApprovalRequests.snapshots.index(
      administratorConnection,
      {
        administratorApprovalRequestId: requestId,
        body: request,
      },
    );
  typia.assert(firstPage);
  const secondPage =
    await api.functional.mallPlatform.administrator.administratorApprovalRequests.snapshots.index(
      administratorConnection,
      {
        administratorApprovalRequestId: requestId,
        body: request,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "pagination metadata should be stable",
    firstPage.pagination,
    secondPage.pagination,
  );
  TestValidator.equals(
    "snapshot ordering should be stable",
    firstPage.data.map((snapshot) => snapshot.id),
    secondPage.data.map((snapshot) => snapshot.id),
  );
  TestValidator.predicate(
    "pagination metadata should exist",
    firstPage.pagination.current >= 1 &&
      firstPage.pagination.limit >= 0 &&
      firstPage.pagination.records >= 0 &&
      firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "all snapshots should belong to the requested approval request",
    firstPage.data.every(
      (snapshot) => snapshot.administratorApprovalRequest.id === requestId,
    ),
  );
  TestValidator.equals(
    "live approval request should not mutate during snapshot browsing",
    approvalRequest,
    expectedRequest,
  );
}
