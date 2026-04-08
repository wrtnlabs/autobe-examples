import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_customer_ban_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminResult);
  // 2. Retrieve customer ban record (using pre-existing ban ID)
  const banId = typia.random<string & tags.Format<"uuid">>();
  const ban = await api.functional.ecommerceMall.administrator.user_bans.at(
    adminConnection,
    { banId: banId satisfies string & tags.Format<"uuid"> },
  );
  typia.assert(ban);
  // 3. Validate customer ban subtype behavior
  TestValidator.equals("user type discriminator", ban.user_type, "customer");
  TestValidator.equals("customer id present", ban.customer_id !== null, true);
  TestValidator.equals("seller id null for customer ban", ban.seller_id, null);
  TestValidator.notEquals("administrator id exists", ban.administrator_id, "");
  TestValidator.predicate("ban reason present", ban.reason.length > 0);
  TestValidator.predicate("banned_at timestamp valid", ban.banned_at !== "");
  // 4. Validate administrator attribution
  TestValidator.equals(
    "administrator id matches requester",
    ban.administrator_id,
    adminResult.id,
  );
  typia.assert(ban.administrator);
  TestValidator.equals(
    "administrator display name present",
    ban.administrator.displayName.length > 0,
    true,
  );
}
