import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_tax_rate_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Generate a valid tax code for deletion
  const taxCode = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Use admin connection to delete the tax rate — should succeed
  await api.functional.communityPlatform.admin.salestaxrates.erase(
    adminConnection,
    {
      taxCode,
    },
  );
  // Step 4: Test deletion of non-existent tax code — should return 404 Not Found
  const nonexistentTaxCode = "00000000-0000-0000-0000-000000000000";
  await TestValidator.httpError(
    "deleting non-existent tax code returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.admin.salestaxrates.erase(
        adminConnection,
        {
          taxCode: nonexistentTaxCode,
        },
      );
    },
  );
  // Step 5: Confirm non-admin cannot delete — unauthorized access should return 401
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "non-admin cannot delete tax rate",
    401,
    async () => {
      await api.functional.communityPlatform.admin.salestaxrates.erase(
        guestConnection,
        {
          taxCode,
        },
      );
    },
  );
}
