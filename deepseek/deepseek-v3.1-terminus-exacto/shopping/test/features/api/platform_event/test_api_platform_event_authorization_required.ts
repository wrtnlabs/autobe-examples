import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommercePlatformEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEvent";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test authorization enforcement for platform event access.
 *
 * Execute the platform event retrieval endpoint without proper super administrator
 * authentication. Verify that the API returns a 401 Unauthorized or 403 Forbidden
 * response indicating that elevated privileges are required to access platform
 * event audit records. Confirm that the platform's robust security model prevents
 * unauthorized users from viewing sensitive system event data.
 */
export async function test_api_platform_event_authorization_required(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid platform event ID
  const eventId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve platform event without authentication
  // The base connection lacks authorization headers for super administrator access
  await TestValidator.httpError(
    "should reject unauthorized platform event access",
    [401, 403],
    async () => {
      await api.functional.ecommerce.superAdministrator.platform_events.at(
        connection,
        { eventId },
      );
    },
  );
}
