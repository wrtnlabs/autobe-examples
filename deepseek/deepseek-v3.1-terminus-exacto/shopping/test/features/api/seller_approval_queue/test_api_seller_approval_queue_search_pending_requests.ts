import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommercePlatformEventOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfSeller";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformEventOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformEventOfSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_approval_queue_search_pending_requests(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Search for pending seller approval requests
  const searchResult =
    await api.functional.ecommerce.administrator.seller_approval_queues.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 20,
        } satisfies IEcommercePlatformEventOfSeller.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate business logic for pending requests
  if (searchResult.data.length > 0) {
    for (const request of searchResult.data) {
      // Verify business requirement: status should be pending
      TestValidator.equals(
        "status should be pending",
        request.status,
        "pending",
      );
      // Verify business requirement: administrator should be undefined for pending requests
      TestValidator.equals(
        "administrator should be undefined for pending",
        request.administrator,
        undefined,
      );
      // Verify business requirement: review start date should be null for pending requests
      TestValidator.equals(
        "review start date should be null",
        request.review_start_date,
        null,
      );
      // Verify business requirement: approval/rejection dates should be null for pending requests
      TestValidator.equals(
        "approval date should be null",
        request.approval_date,
        null,
      );
      TestValidator.equals(
        "rejection date should be null",
        request.rejection_date,
        null,
      );
    }
  }
}