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

/**
 * Test administrator approval request snapshot history pagination and filtering.
 *
 * Validates that administrator approval request snapshot browsing returns a stable paginated result set for audit review. The test exercises repeated reads with identical filters to ensure deterministic ordering and checks that the returned page metadata is consistent with the requested pagination controls.
 *
 * 1. Authenticate as an administrator and create a seller session for submitting the approval request.
 * 2. Create one administrator approval request and browse its snapshot history with a constrained page size.
 * 3. Re-read the same page to confirm stable results and inspect only DTO fields guaranteed by the contract.
 */
export async function test_api_administrator_approval_request_snapshot_history_pagination(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const requestReason = RandomGenerator.paragraph({ sentences: 3 });
  const approvalRequest =
    await generate_random_mall_platform_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          reason: requestReason,
        } satisfies IMallPlatformAdministratorApprovalRequest.ICreate,
      },
    );
  typia.assert(approvalRequest);
  const query = {
    snapshotReason: approvalRequest.reason,
    page: 1,
    limit: 1,
    sort: "+createdAt",
  } satisfies IMallPlatformAdministratorApprovalRequestSnapshot.IRequest;
  const first =
    await api.functional.mallPlatform.administrator.administratorApprovalRequests.snapshots.index(
      administratorConnection,
      {
        administratorApprovalRequestId: approvalRequest.id,
        body: query,
      },
    );
  typia.assert(first);
  const second =
    await api.functional.mallPlatform.administrator.administratorApprovalRequests.snapshots.index(
      administratorConnection,
      {
        administratorApprovalRequestId: approvalRequest.id,
        body: query,
      },
    );
  typia.assert(second);
  TestValidator.equals("pagination current", first.pagination.current, 1);
  TestValidator.equals("pagination limit", first.pagination.limit, 1);
  TestValidator.equals(
    "pagination records",
    first.pagination.records,
    second.pagination.records,
  );
  TestValidator.equals(
    "pagination pages",
    first.pagination.pages,
    second.pagination.pages,
  );
  TestValidator.equals("stable first page data", first.data, second.data);
  if (first.data.length > 0) {
    for (const row of first.data) {
      TestValidator.equals(
        "snapshot parent request id",
        row.administratorApprovalRequest.id,
        approvalRequest.id,
      );
      TestValidator.predicate(
        "snapshot reason is filtered by approval request reason",
        row.snapshotReason.includes(approvalRequest.reason),
      );
    }
  }
}
