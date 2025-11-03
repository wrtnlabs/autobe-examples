import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";
import type { ICommunityBbsVoteReconciliation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsVoteReconciliation";

/**
 * Validate that a vote reconciliation snapshot is protected from
 * unauthenticated access while remaining retrievable by a valid system
 * administrator.
 *
 * Steps:
 *
 * 1. Create a system administrator account (POST /auth/systemAdmin/join) to obtain
 *    admin tokens.
 * 2. Trigger a reconciliation run (PATCH
 *    /communityBbs/systemAdmin/votes/reconciliation) with dryRun to persist a
 *    reconciliation snapshot and capture its id.
 * 3. Attempt to retrieve the reconciliation snapshot without any Authorization
 *    header (use a copied connection with empty headers) and assert that the
 *    call fails (unauthorized/forbidden).
 * 4. Re-attempt retrieval with the admin-authenticated connection and assert
 *    success and snapshot identity.
 */
export async function test_api_vote_reconciliation_snapshot_unauthorized_without_token(
  connection: api.IConnection,
) {
  // 1. Create system admin account and obtain tokens (SDK auto-sets connection.headers.Authorization)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass1"; // satisfies min length and includes upper/lower/digit

  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityBbsSystemAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Run reconciliation (dryRun=true to persist snapshot but not apply fixes)
  const reconcileRequest = {
    targetType: "all",
    dryRun: true,
  } satisfies ICommunityBbsVoteReconciliation.IRequest;

  const snapshot: ICommunityBbsVoteReconciliation =
    await api.functional.communityBbs.systemAdmin.votes.reconciliation.process(
      connection,
      {
        body: reconcileRequest,
      },
    );
  typia.assert(snapshot);
  TestValidator.predicate(
    "reconciliation snapshot id is present",
    typeof snapshot.id === "string" && snapshot.id.length > 0,
  );
  const reconciliationId = snapshot.id;

  // 3. Attempt to GET snapshot without token by creating an unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthorized retrieval without token should fail",
    async () => {
      await api.functional.communityBbs.systemAdmin.votes.reconciliation.at(
        unauthConn,
        {
          reconciliationId,
        },
      );
    },
  );

  // 4. Authorized retrieval with admin token must succeed
  const fetched: ICommunityBbsVoteReconciliation =
    await api.functional.communityBbs.systemAdmin.votes.reconciliation.at(
      connection,
      {
        reconciliationId,
      },
    );
  typia.assert(fetched);
  TestValidator.equals(
    "authorized retrieval returns same id",
    fetched.id,
    reconciliationId,
  );
}
