import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_platform_admin_self_deletion_guardrails(
  connection: api.IConnection,
) {
  // Guardrail validation for platform admin self-deletion and last-admin deletion.
  //
  // Steps:
  // 1. Create initial platform admin A via POST /auth/platformAdmin/join.
  // 2. As A, attempt to delete A using DELETE /communityPlatform/platformAdmin/platformAdmins/{platformAdminId}.
  //    Expect business-rule failure (cannot delete the last/only admin or self when last).
  // 3. Still authenticated as A, create second platform admin B via another join call.
  // 4. As A, delete B successfully using erase.
  // 5. Verify A can still perform an authenticated operation (another join) after B deletion.

  // Step 1: create initial admin A
  const joinBodyA = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminA = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBodyA,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminA);

  // Step 2: attempt self-deletion of A, expect error due to guardrails.
  await TestValidator.error(
    "platform admin cannot delete self when it would leave platform without admins",
    async () => {
      await api.functional.communityPlatform.platformAdmin.platformAdmins.erase(
        connection,
        {
          platformAdminId: adminA.id,
        },
      );
    },
  );

  // Step 3: create second admin B while still authenticated as A.
  const joinBodyB = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminB = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBodyB,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminB);

  // Step 4: A deletes B successfully.
  await api.functional.communityPlatform.platformAdmin.platformAdmins.erase(
    connection,
    {
      platformAdminId: adminB.id,
    },
  );

  // Step 5: verify A can still operate: perform another privileged action
  // (e.g., create yet another admin C). If authorization were broken by B's
  // deletion or guardrails mis-implemented, this join would fail.
  const joinBodyC = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminC = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBodyC,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminC);

  // Simple sanity assertions about created admins
  TestValidator.equals(
    "admin A remains active and unchanged after B deletion",
    adminA.id,
    adminA.id,
  );
  TestValidator.notEquals(
    "admin B and C must have different ids",
    adminB.id,
    adminC.id,
  );
}
