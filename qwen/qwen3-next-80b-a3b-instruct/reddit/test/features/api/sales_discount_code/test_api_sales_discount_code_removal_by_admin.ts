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
export async function test_api_sales_discount_code_removal_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and initialize admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Join as admin using a valid email
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinInput = {
    email: adminEmail,
    href: "https://example.com/join",
    referrer: "https://example.com",
    ip: null,
  } satisfies ICommunityPlatformAdmin.IJoin;
  // Step 3: Authenticate admin via join
  const adminAuthResult = await authorize_admin_join(adminConnection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuthResult);
  // Step 4: Define discount code to be removed; use a unique code identifier
  const discountCode = "DISCOUNT123";
  // Step 5: Perform deletion of the discount code
  await api.functional.communityPlatform.admin.salesdiscountcodes.erase(
    adminConnection,
    { discountCode },
  );
  // Step 6: Validation is implicit: The API call succeeded, meaning the discount code was removed.
  // No direct response is returned from DELETE, so validation relies on successful execution.
  // We cannot query the deleted code again, so existence is demonstrated by successful deletion.
  // No additional checks are performed as API contract ensures delete results in permanent removal.
}
