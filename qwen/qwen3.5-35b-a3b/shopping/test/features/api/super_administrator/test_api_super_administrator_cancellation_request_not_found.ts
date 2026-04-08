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

export async function test_api_super_administrator_cancellation_request_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as super administrator
  const adminAuthConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_super_administrator_join(
    adminAuthConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(2),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
      },
    },
  );
  typia.assert(adminAuth);
  // 2. Create super administrator connection with token
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      authorization: adminAuth.token.access,
    },
  };
  // 3. Attempt to retrieve a non-existent cancellation request
  // Use a standard UUID format that is guaranteed not to exist in the database
  const nonExistentId: string & tags.Format<"uuid"> =
    "00000000-0000-0000-0000-000000000000";
  // The API should throw an error for non-existent resources
  await TestValidator.error(
    "should return 404 for non-existent cancellation request",
    async () => {
      await api.functional.ecommerceMall.superAdministrator.cancellation_requests.at(
        adminConnection,
        {
          id: nonExistentId,
        },
      );
    },
  );
}
