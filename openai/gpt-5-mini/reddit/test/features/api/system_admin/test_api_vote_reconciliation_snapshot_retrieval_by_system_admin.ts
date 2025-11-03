import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";
import type { ICommunityBbsVoteReconciliation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsVoteReconciliation";

/**
 * Validate retrieval of a vote reconciliation snapshot by a system
 * administrator.
 *
 * Business context:
 *
 * 1. Provision a new system administrator account via POST /auth/systemAdmin/join
 * 2. Trigger a reconciliation run scoped to a post via PATCH
 *    /communityBbs/systemAdmin/votes/reconciliation
 * 3. Retrieve the produced reconciliation snapshot via GET
 *    /communityBbs/systemAdmin/votes/reconciliation/{reconciliationId}
 *
 * Validations:
 *
 * - Responses are type-correct (typia.assert)
 * - Retrieved snapshot id matches the requested id
 * - Numeric fields are non-negative where applicable
 * - Discrepancy equals observed_count - expected_count
 * - Reconciled_at exists when reconciled === true
 */
export async function test_api_vote_reconciliation_snapshot_retrieval_by_system_admin(
  connection: api.IConnection,
) {
  // 1) Create a system administrator account and obtain authorization
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminBody = {
    email: adminEmail,
    password: "Passw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityBbsSystemAdmin.ICreate;

  const auth: ICommunityBbsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminBody,
    });
  typia.assert(auth);
  typia.assert<IAuthorizationToken>(auth.token);

  // 2) Trigger a reconciliation run scoped to a single post (dry run to avoid side-effects)
  const targetId: string = typia.random<string & tags.Format<"uuid">>();
  const reconcileRequest = {
    targetType: "post",
    targetId,
    dryRun: true,
  } satisfies ICommunityBbsVoteReconciliation.IRequest.IPost;

  const snapshot: ICommunityBbsVoteReconciliation =
    await api.functional.communityBbs.systemAdmin.votes.reconciliation.process(
      connection,
      { body: reconcileRequest },
    );
  typia.assert(snapshot);

  // Basic sanity checks on snapshot
  TestValidator.equals(
    "snapshot target_type matches request",
    snapshot.target_type,
    reconcileRequest.targetType,
  );
  TestValidator.equals(
    "snapshot target_id matches request",
    snapshot.target_id,
    reconcileRequest.targetId,
  );
  TestValidator.predicate(
    "snapshot id is present",
    typeof snapshot.id === "string" && snapshot.id.length > 0,
  );

  // 3) Retrieve the snapshot by its id
  const fetched: ICommunityBbsVoteReconciliation =
    await api.functional.communityBbs.systemAdmin.votes.reconciliation.at(
      connection,
      { reconciliationId: snapshot.id },
    );
  typia.assert(fetched);

  // 4) Business validations
  TestValidator.equals(
    "retrieved snapshot id matches requested id",
    fetched.id,
    snapshot.id,
  );
  TestValidator.equals(
    "retrieved target_type matches",
    fetched.target_type,
    snapshot.target_type,
  );
  TestValidator.equals(
    "retrieved target_id matches",
    fetched.target_id,
    snapshot.target_id,
  );

  // Numeric fields are numbers (typia.assert ensures types) and non-negative where applicable
  TestValidator.predicate(
    "observed_count is non-negative",
    fetched.observed_count >= 0,
  );
  TestValidator.predicate(
    "expected_count is non-negative",
    fetched.expected_count >= 0,
  );

  // discrepancy must equal observed_count - expected_count
  TestValidator.equals(
    "discrepancy equals observed_count - expected_count",
    fetched.discrepancy,
    fetched.observed_count - fetched.expected_count,
  );

  // reconciled -> reconciled_at must exist; if not reconciled, reconciled_at should be null/undefined
  if (fetched.reconciled === true) {
    TestValidator.predicate(
      "reconciled_at exists when reconciled is true",
      fetched.reconciled_at !== null && fetched.reconciled_at !== undefined,
    );
  } else {
    TestValidator.predicate(
      "reconciled_at is null or undefined when not reconciled",
      fetched.reconciled_at === null || fetched.reconciled_at === undefined,
    );
  }
}
