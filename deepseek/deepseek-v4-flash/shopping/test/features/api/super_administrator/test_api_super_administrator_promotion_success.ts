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

/**
 * Test that an existing super administrator can successfully promote a regular
 * administrator to super administrator status.
 *
 * Verifies the full promotion workflow: creating a promoter super admin and a
 * target regular admin, authenticating as the promoter, calling the promotion
 * endpoint with the target's `administrator_id`, and validating the response.
 *
 * Validates that the linked administrator's `grade` becomes `"super"`, the
 * response includes valid JWT tokens, and the newly promoted super
 * administrator can authenticate independently with the provided credentials.
 *
 * 1. Create a promoter super administrator account.
 * 2. Create a target regular administrator account.
 * 3. Authenticate as the promoter super administrator.
 * 4. Call the promotion endpoint with the target admin's ID and new
 *    super admin credentials.
 * 5. Validate the response: administrator.id matches, administrator.grade
 *    is "super", timestamps are valid, JWT tokens exist.
 * 6. Verify the new super admin can log in with the provided credentials.
 */
export async function test_api_super_administrator_promotion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a promoter super administrator
  const promoterConnection: api.IConnection = { host: connection.host };
  const promoterEmail = typia.random<string & tags.Format<"email">>();
  const promoterPassword = RandomGenerator.alphaNumeric(16);
  const promoter = await authorize_super_administrator_join(
    promoterConnection,
    {
      body: {
        email: promoterEmail,
        password: promoterPassword,
      },
    },
  );
  typia.assert(promoter);
  // 2. Create a target regular administrator
  const targetConnection: api.IConnection = { host: connection.host };
  const target = await authorize_administrator_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(target);
  // 3. Authenticate as the promoter super administrator (fresh login)
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  await authorize_super_administrator_login(promoterConnection, {
    body: {
      email: promoterEmail,
      password: promoterPassword,
      href,
      referrer,
    },
  });
  // 4. Promote the target regular administrator to super administrator
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const result = await authorize_super_administrator_join(promoterConnection, {
    body: {
      administrator_id: target.id,
      email: superAdminEmail,
      password: superAdminPassword,
      href,
      referrer,
    },
  });
  typia.assert(result);
  // 5. Validate the promotion response
  TestValidator.equals(
    "administrator.id matches input administrator_id",
    result.administrator.id,
    target.id,
  );
  TestValidator.predicate(
    "administrator grade is super",
    result.administrator.grade === "super",
  );
  // 6. Verify the new super administrator can authenticate independently
  const newSuperAdminConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_super_administrator_login(
    newSuperAdminConnection,
    {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
        href,
        referrer,
      },
    },
  );
  typia.assert(loginResult);
  TestValidator.equals(
    "login admin id matches promoted admin id",
    loginResult.administrator.id,
    target.id,
  );
  TestValidator.equals(
    "login administrator.id matches promotion result administrator.id",
    loginResult.administrator.id,
    result.administrator.id,
  );
}
