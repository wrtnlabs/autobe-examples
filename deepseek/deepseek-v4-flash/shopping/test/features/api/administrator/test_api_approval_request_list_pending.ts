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

export async function test_api_approval_request_list_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  // 2. List pending approval requests
  const page =
    await api.functional.eCommerceMall.administrator.approval_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
        } satisfies IECommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(page);
  // 3. Validate all returned records have status='pending'
  TestValidator.predicate("all pending requests have status 'pending'", () =>
    page.data.every((record) => record.status === "pending"),
  );
  // 4. Validate that pending requests have null reviewer and reviewed_at
  TestValidator.predicate("all pending requests have null reviewer", () =>
    page.data.every((record) => record.reviewer === null),
  );
  TestValidator.predicate("all pending requests have null reviewed_at", () =>
    page.data.every((record) => record.reviewed_at === null),
  );
  // 5. Validate results sorted by created_at descending (newest first)
  for (let i: number = 1; i < page.data.length; ++i) {
    TestValidator.predicate(
      `records sorted by created_at descending (index ${i})`,
      () => page.data[i - 1].created_at >= page.data[i].created_at,
    );
  }
  // 6. Validate pagination metadata values
  TestValidator.predicate(
    "pagination current is >= 1",
    () => page.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is >= 1 and <= 100",
    () => page.pagination.limit >= 1 && page.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records is >= 0",
    () => page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is >= 0",
    () => page.pagination.pages >= 0,
  );
  // 7. Validate that data length respects pagination limit
  TestValidator.predicate(
    "data length <= pagination limit",
    () => page.data.length <= page.pagination.limit,
  );
}
