import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Verify that an unknown seller detail lookup returns not found.
 *
 * Confirms the administrator seller detail endpoint rejects a missing seller identifier with a 404 response.
 * The test authenticates as an administrator through the join flow, then performs a read-only lookup with a valid UUID that should not resolve to an existing seller account.
 *
 * This validates that the endpoint does not accidentally expose another seller's profile or approval data when the requested sellerId is absent.
 * Because the operation is read-only, the test focuses on the not-found behavior and avoids any mutation workflow.
 */
export async function test_api_seller_detail_not_found(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  await TestValidator.httpError(
    "unknown seller detail should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.sellers.at(
        adminConnection,
        {
          sellerId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
