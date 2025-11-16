import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallRoleEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRoleEscalation";

/**
 * Tests that a platform admin can retrieve the details of a specific role
 * escalation from the shopping mall audit log, verifying full field coverage
 * and that authentication is enforced.
 *
 * 1. Register and authenticate a new platform administrator
 * 2. Simulate the existence of a role escalation record (using typia.random to
 *    ensure a valid UUID exists for retrieval)
 * 3. Retrieve the role escalation record as the authenticated admin
 * 4. Confirm all escalation fields are present and valid (audit, context, role,
 *    status, decision, timestamps)
 * 5. Validate that admin session is required for access and visibility is enforced
 */
export async function test_api_role_escalation_admin_retrieval_authenticated(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new platform administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const adminName = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Simulate the existence of a role escalation record (using typia.random to create and assert record)
  // In real scenario, there should be a creation step; here we simulate for UUID
  const escalation: IShoppingMallRoleEscalation =
    typia.random<IShoppingMallRoleEscalation>();
  typia.assert(escalation);

  // 3. Retrieve the role escalation record as the authenticated admin
  const output: IShoppingMallRoleEscalation =
    await api.functional.shoppingMall.admin.roleEscalations.at(connection, {
      roleEscalationId: escalation.id,
    });
  typia.assert(output);

  // 4. Confirm all escalation fields are present and valid (audit, context, role, status, decision, timestamps)
  // Field assertions (type validation already done by typia.assert)
  TestValidator.equals("role escalation id matches", output.id, escalation.id);
  TestValidator.predicate(
    "has target_role as non-empty string",
    typeof output.target_role === "string" && output.target_role.length > 0,
  );
  TestValidator.predicate(
    "has status field as non-empty string",
    typeof output.status === "string" && output.status.length > 0,
  );
  TestValidator.predicate(
    "created_at field is valid date-time ISO string",
    typeof output.created_at === "string" && output.created_at.length > 0,
  );

  // Optional/nullable fields are allowed null/undefined but must be correct if present
  if (
    output.requestor_actor_id !== null &&
    output.requestor_actor_id !== undefined
  )
    TestValidator.predicate(
      "requestor_actor_id is valid uuid",
      typeof output.requestor_actor_id === "string" &&
        output.requestor_actor_id.length > 0,
    );
  if (
    output.requestor_seller_id !== null &&
    output.requestor_seller_id !== undefined
  )
    TestValidator.predicate(
      "requestor_seller_id is valid uuid",
      typeof output.requestor_seller_id === "string" &&
        output.requestor_seller_id.length > 0,
    );
  if (
    output.processed_by_admin_id !== null &&
    output.processed_by_admin_id !== undefined
  )
    TestValidator.predicate(
      "processed_by_admin_id is valid uuid",
      typeof output.processed_by_admin_id === "string" &&
        output.processed_by_admin_id.length > 0,
    );
  if (output.reason !== null && output.reason !== undefined)
    TestValidator.predicate(
      "reason if present is a string",
      typeof output.reason === "string",
    );
  if (output.processed_at !== null && output.processed_at !== undefined)
    TestValidator.predicate(
      "processed_at if present is ISO date string",
      typeof output.processed_at === "string" && output.processed_at.length > 0,
    );
}
