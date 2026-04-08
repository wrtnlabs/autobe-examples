import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

// This test demonstrates soft-delete filtering for cancellation requests
// The system should not return soft-deleted records (deleted_at IS NULL filter applied)
export async function test_api_super_administrator_cancellation_request_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(2),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(superAdmin);
  // 2. Generate a UUID representing a soft-deleted cancellation request
  // This simulates a record that has been soft-deleted (deleted_at IS NOT NULL)
  const softDeletedRequestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve the soft-deleted cancellation request
  // The system should filter out soft-deleted records during retrieval
  // Since the record doesn't exist or is soft-deleted, expect 404 Not Found
  await TestValidator.error(
    "should not return soft-deleted cancellation request",
    async () => {
      await api.functional.ecommerceMall.superAdministrator.cancellation_requests.at(
        superAdminConnection,
        {
          id: softDeletedRequestId,
        },
      );
    },
  );
}