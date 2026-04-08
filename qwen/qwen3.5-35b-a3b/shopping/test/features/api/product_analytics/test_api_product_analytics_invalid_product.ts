import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallProductAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_analytics_invalid_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration using utility function (MUST USE utility over SDK)
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        display_name: RandomGenerator.name(2),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceMallAdministrator.IJoin,
    });
  typia.assert(admin);
  // 2. Create admin-specific connection with token from registration
  const adminAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: admin.token.access,
    },
  };
  // 3. Scenario A: Non-existent product UUID
  // Generate a valid UUID format that doesn't exist in database
  const nonExistentId: string = typia.random<string & tags.Format<"uuid">>();
  // Attempt to get analytics for non-existent product
  await TestValidator.httpError(
    "should return 404 for non-existent product",
    404,
    async () => {
      await api.functional.ecommerceMall.administrator.products.analytics(
        adminAuthConnection,
        { id: nonExistentId },
      );
    },
  );
  // 4. Scenario B: Invalid UUID format (malformed)
  // Use typia.random to generate UUID, then truncate/modify to make invalid
  const validUuid = typia.random<string & tags.Format<"uuid">>();
  // Truncate to make it an invalid UUID (should trigger validation error)
  const invalidUuid = validUuid.substring(0, 10);
  await TestValidator.httpError(
    "should return validation error for malformed UUID",
    [400, 422],
    async () => {
      await api.functional.ecommerceMall.administrator.products.analytics(
        adminAuthConnection,
        { id: invalidUuid },
      );
    },
  );
}
