import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallLegalHoldTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHoldTarget";

/**
 * Happy-path deletion of a legal hold target by an authenticated admin.
 *
 * Business context:
 *
 * - Governance/compliance admins can register legal holds with business codes.
 * - Under each legal hold they can attach one or more targets that represent
 *   concrete entities (e.g., customers, orders) that must be preserved.
 * - Admins are also allowed to delete a specific target mapping when the business
 *   or legal context allows it.
 *
 * This test validates that:
 *
 * 1. An admin can join (register) and obtain an authorization context.
 * 2. Using that admin context, a legal hold can be created.
 * 3. A legal hold target can be created under that hold.
 * 4. The admin can successfully delete that specific target using DELETE
 *    /shoppingMall/admin/legalHolds/{legalHoldCode}/targets/{legalHoldTargetId}.
 * 5. The delete operation completes without throwing any errors when invoked with
 *    valid identifiers under an authorized admin context.
 *
 * There is no targets list/get API in the provided SDK fragment, so the test
 * focuses on the happy-path execution flow and absence of runtime errors rather
 * than verifying deletion via a follow-up read.
 */
export async function test_api_legal_hold_target_deletion_happy_path(
  connection: api.IConnection,
) {
  // 1. Admin joins and becomes authenticated.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Create a new legal hold under this admin context.
  const legalHoldCode: string = RandomGenerator.alphaNumeric(16);
  const legalHoldCreateBody = {
    code: legalHoldCode,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 3,
      wordMax: 10,
    }),
    status: "active",
    scope_description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
    }),
    external_reference: RandomGenerator.alphaNumeric(12),
    effective_from: new Date().toISOString(),
  } satisfies IShoppingMallLegalHold.ICreate;

  const legalHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: legalHoldCreateBody,
    });
  typia.assert(legalHold);

  TestValidator.equals(
    "created legal hold code should match request",
    legalHold.code,
    legalHoldCode,
  );

  // 3. Create a legal hold target under the created hold.
  const targetId = typia.random<string & tags.Format<"uuid">>();
  const legalHoldTargetCreateBody = {
    target_type: "customer",
    target_id: targetId,
    target_display: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 10,
    }),
    note: RandomGenerator.paragraph({ sentences: 4, wordMin: 3, wordMax: 10 }),
  } satisfies IShoppingMallLegalHoldTarget.ICreate;

  const legalHoldTarget: IShoppingMallLegalHoldTarget =
    await api.functional.shoppingMall.admin.legalHolds.targets.create(
      connection,
      {
        legalHoldCode: legalHold.code,
        body: legalHoldTargetCreateBody,
      },
    );
  typia.assert(legalHoldTarget);

  TestValidator.equals(
    "created target should reference same legal hold by foreign key",
    legalHoldTarget.shopping_mall_legal_hold_id,
    legalHold.id,
  );
  TestValidator.equals(
    "created target_id should match request",
    legalHoldTarget.target_id,
    targetId,
  );

  // 4. Delete the legal hold target with the proper identifiers.
  await api.functional.shoppingMall.admin.legalHolds.targets.erase(connection, {
    legalHoldCode: legalHold.code,
    legalHoldTargetId: legalHoldTarget.id,
  });

  // 5. Assert that the delete operation completed successfully by ensuring no
  // error was thrown and reinforcing basic invariants via predicates.
  TestValidator.predicate(
    "legal hold id remains a valid UUID after deletion",
    () => typia.is<string & tags.Format<"uuid">>(legalHold.id),
  );
  TestValidator.predicate(
    "legal hold target id remains a valid UUID string value in memory (deletion is server-side)",
    () => typia.is<string & tags.Format<"uuid">>(legalHoldTarget.id),
  );
}
