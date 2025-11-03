import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";
import type { ICommunityBbsVoteReconciliation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsVoteReconciliation";

export async function test_api_vote_reconciliation_snapshot_not_found_by_system_admin(
  connection: api.IConnection,
) {
  // 1) Register and authenticate a new system administrator
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityBbsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        // Password satisfies: min 8 chars, includes upper, lower, digit
        password: "Passw0rd!",
      } satisfies ICommunityBbsSystemAdmin.ICreate,
    });
  typia.assert(admin);

  // 2) Generate a valid, well-formed UUID that does not correspond to any
  // existing reconciliation snapshot in the system
  const nonExistentReconciliationId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3) Attempt to retrieve the snapshot using the admin credentials. The call
  // should fail because no snapshot exists for the generated UUID. We assert
  // failure using TestValidator.error and avoid inspecting HTTP status or
  // error body content per testing policies.
  await TestValidator.error(
    "retrieving non-existent reconciliation snapshot should fail",
    async () => {
      await api.functional.communityBbs.systemAdmin.votes.reconciliation.at(
        connection,
        {
          reconciliationId: nonExistentReconciliationId,
        },
      );
    },
  );
}
