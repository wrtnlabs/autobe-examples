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
export async function test_api_sales_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the admin
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate realistic admin join data
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminHref = "https://example.com/join";
  const adminReferrer = "https://example.com";
  // Authenticate admin via join
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      href: adminHref,
      referrer: adminReferrer,
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Generate a random sales code (string)
  const saleCode = typia.random<string>();
  // Delete the sales record using admin connection
  await api.functional.communityPlatform.admin.sales.erase(adminConnection, {
    saleCode,
  });
  // Since the function returns void, no need for typia.assert
}
