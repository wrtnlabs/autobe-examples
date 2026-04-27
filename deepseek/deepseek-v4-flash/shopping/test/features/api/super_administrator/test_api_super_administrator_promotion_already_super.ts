import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_promotion_already_super(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create the promoter's underlying administrator account
  const promoterAdminConnection: api.IConnection = { host: connection.host };
  const promoterAdmin = await authorize_administrator_join(
    promoterAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IECommerceMallAdministrator.IJoin,
    },
  );
  typia.assert(promoterAdmin);
  // Step 2: Bootstrap the promoter to super administrator status
  const promoterSuperBootstrapConnection: api.IConnection = {
    host: connection.host,
  };
  const promoterSuperJoinInput = {
    administrator_id: promoterAdmin.id,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IECommerceMallSuperAdministrator.IJoin;
  const promoterSuper = await authorize_super_administrator_join(
    promoterSuperBootstrapConnection,
    { body: promoterSuperJoinInput },
  );
  typia.assert(promoterSuper);
  // Step 3: Authenticate as the promoter super administrator
  const promoterConnection: api.IConnection = { host: connection.host };
  const promoterLogin = await authorize_super_administrator_login(
    promoterConnection,
    {
      body: {
        email: promoterSuperJoinInput.email,
        password: promoterSuperJoinInput.password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IECommerceMallSuperAdministrator.ILogin,
    },
  );
  typia.assert(promoterLogin);
  // Step 4: Create the target regular administrator account
  const targetAdminConnection: api.IConnection = { host: connection.host };
  const targetAdmin = await authorize_administrator_join(
    targetAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IECommerceMallAdministrator.IJoin,
    },
  );
  typia.assert(targetAdmin);
  // Step 5: First promotion (test setup) — promote target admin to super admin
  // Save the promoter's auth token before the promotion mutates the connection
  const promoterAuthToken: string | undefined = promoterConnection.headers
    ?.Authorization as string | undefined;
  const targetSuperJoinInput = {
    administrator_id: targetAdmin.id,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IECommerceMallSuperAdministrator.IJoin;
  const targetSuper = await authorize_super_administrator_join(
    promoterConnection,
    { body: targetSuperJoinInput },
  );
  typia.assert(targetSuper);
  // Step 6: Duplicate promotion attempt — should fail with 409 Conflict or 422
  const duplicateEmail = typia.random<string & tags.Format<"email">>();
  const duplicatePassword = RandomGenerator.alphaNumeric(16);
  await TestValidator.httpError(
    "duplicate super administrator promotion",
    [409, 422],
    async () => {
      const duplicateAttemptConnection: api.IConnection = {
        host: connection.host,
        headers: {
          Authorization: promoterAuthToken!,
        },
      };
      await authorize_super_administrator_join(duplicateAttemptConnection, {
        body: {
          administrator_id: targetAdmin.id,
          email: duplicateEmail,
          password: duplicatePassword,
        },
      });
    },
  );
  // Step 7: Verify the original promotion is still intact
  // The promoted admin can still log in with credentials from the first promotion
  const verifyConnection: api.IConnection = { host: connection.host };
  const verifyLogin = await authorize_super_administrator_login(
    verifyConnection,
    {
      body: {
        email: targetSuperJoinInput.email,
        password: targetSuperJoinInput.password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IECommerceMallSuperAdministrator.ILogin,
    },
  );
  typia.assert(verifyLogin);
}
