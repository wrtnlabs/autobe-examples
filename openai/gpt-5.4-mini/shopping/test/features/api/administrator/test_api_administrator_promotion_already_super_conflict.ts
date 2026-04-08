import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Rejects redundant promotion attempts against an already super administrator.
 *
 * Verifies that a valid super administrator session cannot promote a target administrator that is already at the highest privilege grade. The endpoint must respond with a conflict instead of applying any state change.
 *
 * This test focuses on the conflict branch of administrator governance and ensures redundant grade escalation is blocked while the existing administrator hierarchy remains intact.
 *
 * 1. Create and authenticate a super administrator account.
 * 2. Use that same administrator as the promotion target, representing an already-super administrator.
 * 3. Call the promotion endpoint and verify it fails with HTTP conflict.
 */
export async function test_api_administrator_promotion_already_super_conflict(
  connection: api.IConnection,
): Promise<void> {
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_administrator_join(superAdminConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@example.com` satisfies string,
      password: RandomGenerator.alphaNumeric(12) satisfies string,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(superAdmin);
  await TestValidator.httpError(
    "promoting an already super administrator should conflict",
    409,
    async () => {
      await api.functional.mallPlatform.administrator.administrators.promote(
        superAdminConnection,
        {
          administratorId: superAdmin.id,
        },
      );
    },
  );
}
