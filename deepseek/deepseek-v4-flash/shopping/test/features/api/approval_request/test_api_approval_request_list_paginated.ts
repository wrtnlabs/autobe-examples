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

export async function test_api_approval_request_list_paginated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as an administrator
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
  // 2. Fetch approval requests with pagination (page 1, limit 10)
  const output: IPageIECommerceMallSellerApprovalRequest.ISummary =
    await api.functional.eCommerceMall.administrator.approval_requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IECommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(output);
  // 3. Validate pagination metadata
  TestValidator.equals("current page", output.pagination.current, 1);
  TestValidator.equals("page limit", output.pagination.limit, 10);
  TestValidator.predicate(
    "records count is non-negative",
    () => output.pagination.records >= 0,
  );
  TestValidator.equals(
    "total pages computed correctly",
    output.pagination.pages,
    Math.ceil(output.pagination.records / output.pagination.limit),
  );
  // 4. Validate data array size respects limit
  TestValidator.predicate(
    "data length does not exceed limit",
    () => output.data.length <= output.pagination.limit,
  );
  // 5. Validate sorting by created_at descending (newest first)
  for (let i: number = 1; i < output.data.length; i++) {
    TestValidator.predicate(
      `item [${i - 1}] created_at >= item [${i}] created_at`,
      () => output.data[i - 1].created_at >= output.data[i].created_at,
    );
  }
  // 6. Validate each record has the required fields
  for (const record of output.data) {
    typia.assert(record);
  }
}
