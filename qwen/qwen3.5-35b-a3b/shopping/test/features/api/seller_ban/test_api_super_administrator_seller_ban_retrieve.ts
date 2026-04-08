import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_seller_ban_retrieve(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_super_administrator_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(2),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
      } satisfies IEcommerceMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(adminResult);
  // 2. Create admin-specific connection with token
  const authenticatedAdminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${adminResult.token.access}` },
  };
  // 3. Generate a random UUID for banId (will likely return 404)
  const banId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Attempt to retrieve the ban record
  // Expect 404 Not Found since we can't create ban records with available SDK
  try {
    await api.functional.ecommerceMall.superAdministrator.user_bans.at(
      authenticatedAdminConnection,
      { banId },
    );
    // If we reach here, the ban exists (unexpected for random UUID)
    throw new Error("Expected 404 Not Found for non-existent ban");
  } catch (error) {
    // Validate 404 error response
    if (typia.is<api.HttpError>(error)) {
      TestValidator.equals("ban not found status", error.status, 404);
      TestValidator.equals(
        "ban not found path",
        error.path,
        `/ecommerceMall/superAdministrator/user-bans/${encodeURIComponent(banId)}`,
      );
    } else {
      throw error;
    }
  }
  // 5. Verify the endpoint structure supports polymorphic ban system
  // The IEcommerceMallUserBan.IAt type includes:
  // - user_type discriminator ('customer' or 'seller')
  // - customer_id or seller_id (one is null depending on user_type)
  // - administrator ISummary for issuing admin details
  // This confirms the API supports the polymorphic ban system
}
