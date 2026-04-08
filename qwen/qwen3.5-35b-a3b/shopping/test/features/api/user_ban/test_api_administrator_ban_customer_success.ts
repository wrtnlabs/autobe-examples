import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import type { IEcommerceMallUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfCustomer";
import type { IEcommerceMallUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfSeller";
import type { IEcommerceMallUserBanRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_administrator_ban_customer_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - register with explicit credentials
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);
  const adminDisplayName: string = RandomGenerator.name(2);
  const adminResult = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: adminDisplayName,
      email: adminEmail,
      password: adminPassword,
      grade: "regular",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminResult);
  // 2. Test customer setup - register with explicit credentials
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword: string = RandomGenerator.alphaNumeric(16);
  const customerDisplayName: string = RandomGenerator.name();
  const customerResult = await authorize_member_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      display_name: customerDisplayName,
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(customerResult);
  const customerUserId: string & tags.Format<"uuid"> = customerResult.id;
  // 3. Administrator login (re-authenticate for ban operation)
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdministrator.ILogin,
  });
  // 4. Submit ban request
  const banReason: string & tags.MinLength<1> & tags.MaxLength<500> =
    "Violation of terms of service - spamming";
  const banResponse =
    await api.functional.ecommerceMall.administrator.users.ban.update(
      adminLoginConnection,
      {
        userId: customerUserId,
        body: {
          action: "ban",
          user_type: "customer",
        } satisfies IEcommerceMallUserBanRequest,
      },
    );
}