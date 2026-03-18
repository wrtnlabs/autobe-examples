import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_login_unavailable_account_rejected(
  connection: api.IConnection,
): Promise<void> {
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = "OwnerPass1234!";
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_owner_join(joinConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joined);
  const duplicateJoinConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("duplicate owner join is rejected", async () => {
    await authorize_owner_join(duplicateJoinConnection, {
      body: {
        email: ownerEmail,
        password: ownerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  });
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedIn = await authorize_owner_login(loginConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
    } satisfies IHrmTimeTrackingOwner.ILogin,
  });
  typia.assert(loggedIn);
  TestValidator.equals(
    "joined owner email preserved",
    joined.email,
    ownerEmail,
  );
  TestValidator.equals(
    "logged in owner email preserved",
    loggedIn.email,
    ownerEmail,
  );
  TestValidator.equals("same owner id after login", loggedIn.id, joined.id);
}
