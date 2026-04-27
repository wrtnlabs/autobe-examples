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
 * Test that attempting to demote an administrator who is already a regular administrator (not a super administrator) returns a 422 Conflict error.
 *
 * Validates that the super administrator demotion endpoint correctly rejects attempts to demote a target that is already a regular administrator. The test creates two administrators, promotes one to super administrator, and then uses that super administrator to attempt demotion of the other (still regular) administrator.
 *
 * The 422 status code indicates a business-logic-level conflict: the system correctly identifies that the target is not a super administrator, making demotion semantically invalid. No grade change records should be created since no actual demotion occurs, and both administrators' grade statuses remain unchanged.
 *
 * 1. Login as the pre-seeded super administrator to bootstrap.
 * 2. Create a regular administrator account (admin A).
 * 3. Promote admin A to super administrator using the seed super admin's session.
 * 4. Create a second regular administrator account (admin B) — never promoted.
 * 5. Attempt to demote admin B using admin A's super administrator session — expects 422 Conflict.
 */
export async function test_api_super_administrator_demote_already_regular_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Login as the pre-seeded super administrator
  const seedConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_login(seedConnection, {
    body: {
      email: "admin@test.com",
      password: "admin",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000/",
    } satisfies IECommerceMallSuperAdministrator.ILogin,
  });
  // Step 2: Create admin A (regular administrator)
  const adminARegularConnection: api.IConnection = { host: connection.host };
  const adminA = await authorize_administrator_join(adminARegularConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(adminA);
  // Step 3: Promote admin A to super administrator using seed super admin
  // After this call, seedConnection carries admin A's super administrator token
  const adminASuper = await authorize_super_administrator_join(seedConnection, {
    body: {
      administrator_id: adminA.id,
    },
  });
  typia.assert(adminASuper);
  // Step 4: Create admin B (regular administrator — never promoted)
  const adminBConnection: api.IConnection = { host: connection.host };
  const adminB = await authorize_administrator_join(adminBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(adminB);
  // Step 5: Attempt to demote admin B (already regular) — expect 422 Conflict
  await TestValidator.httpError(
    "demote already regular administrator",
    422,
    async () => {
      await api.functional.eCommerceMall.superAdministrator.administrators.demote(
        seedConnection,
        {
          administratorId: adminB.id,
        },
      );
    },
  );
}
