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

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test promoting a non-existent administrator (random UUID) results in 404 error.
 *
 * Validates that the super administrator promotion endpoint (`POST /auth/superAdministrator/join`) rejects requests referencing a non-existent regular administrator account with a 404 Not Found error. Ensures no side effects occur on failure — no session records created, no tokens issued.
 *
 * This test verifies the system's atomic validation behavior: the existence of the referenced administrator is checked before any processing begins, preventing partial state creation on failure.
 *
 * 1. Bootstrap a super administrator account by promoting a pre-seeded regular administrator via `join`.
 * 2. Re-authenticate with the same credentials via `login` to establish a fresh session.
 * 3. Attempt to promote a non-existent administrator (random UUID) via `join`.
 * 4. Validate that the operation throws a 404 HTTP error.
 */
export async function test_api_super_administrator_promotion_nonexistent_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Bootstrap a super administrator by promoting a pre-seeded admin
  const promoterConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const authorized =
    await api.functional.eCommerceMall.auth.superAdministrator.join(
      promoterConnection,
      {
        body: {
          administrator_id: typia.random<string & tags.Format<"uuid">>(),
          email,
          password,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IECommerceMallSuperAdministrator.IJoin,
      },
    );
  typia.assert(authorized);
  // Step 2: Login as the promoter super administrator
  const loginConnection: api.IConnection = { host: connection.host };
  await api.functional.eCommerceMall.auth.superAdministrator.login(
    loginConnection,
    {
      body: {
        email,
        password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IECommerceMallSuperAdministrator.ILogin,
    },
  );
  // Step 3: Attempt to promote a non-existent administrator → expect 404
  const nonExistentUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "promote non-existent administrator",
    404,
    async () => {
      await api.functional.eCommerceMall.auth.superAdministrator.join(
        loginConnection,
        {
          body: {
            administrator_id: nonExistentUuid,
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IECommerceMallSuperAdministrator.IJoin,
        },
      );
    },
  );
}
