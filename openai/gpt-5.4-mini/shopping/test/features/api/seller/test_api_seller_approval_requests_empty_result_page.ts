import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformAdministratorApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller approval request browsing returns an empty page for unmatched criteria.
 *
 * Verifies that seller-authorized access to the approval request list gracefully handles filters that match no records.
 * The response must still include pagination metadata, and the data collection must be empty.
 *
 * 1. Register a seller and obtain an authenticated seller connection.
 * 2. Query the seller approval-request list using search criteria that should not match any record.
 * 3. Validate that the response is an empty page with zero records and no unexpected pagination anomalies.
 */
export async function test_api_seller_approval_requests_empty_result_page(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!" satisfies string,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const response =
    await api.functional.mallPlatform.seller.approval_requests.index(
      sellerConnection,
      {
        body: {
          search: RandomGenerator.alphaNumeric(32),
          page: 1,
          limit: 10,
        } satisfies IMallPlatformAdministratorApprovalRequest.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals("empty approval request page data", response.data, []);
  TestValidator.equals(
    "empty approval request page records",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty approval request page pages",
    response.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty approval request page current",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty approval request page limit",
    response.pagination.limit,
    10,
  );
}
