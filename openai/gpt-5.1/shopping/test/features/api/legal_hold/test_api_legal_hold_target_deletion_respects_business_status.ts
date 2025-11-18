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
 * Validate that deleting a legal hold target is wired correctly for multiple
 * legal hold statuses.
 *
 * Business intent within current API limitations:
 *
 * - An admin can create legal holds with different status strings (treated as
 *   opaque values here, e.g. "draft" and "active").
 * - Under each legal hold, the admin can register one or more targets.
 * - The DELETE endpoint for targets must work end-to-end for targets under these
 *   holds, regardless of the specific status value, as long as the backend
 *   business rules permit deletion.
 *
 * Because the SDK currently exposes only join/create/create/delete without any
 * read/list APIs for targets, this test focuses on:
 *
 * - End-to-end happy-path wiring for target deletion under two different legal
 *   hold statuses.
 * - Verifying that all non-void responses conform to their DTOs via
 *   typia.assert(), and that erase() completes without throwing.
 *
 * Test flow:
 *
 * 1. Admin join: call POST /auth/admin/join to create an administrator and
 *    establish an authenticated connection context.
 * 2. Create a "draft" legal hold via POST /shoppingMall/admin/legalHolds.
 * 3. Create a legal hold target under the draft hold using POST
 *    /shoppingMall/admin/legalHolds/{legalHoldCode}/targets.
 * 4. Call DELETE
 *    /shoppingMall/admin/legalHolds/{legalHoldCode}/targets/{legalHoldTargetId}
 *    and rely on the absence of errors as proof of successful deletion.
 * 5. Create a second legal hold with a different status (e.g. "active"), plus a
 *    target under it.
 * 6. Call DELETE for that second target as well, again treating a successful call
 *    (no thrown error) as successful deletion.
 */
export async function test_api_legal_hold_target_deletion_respects_business_status(
  connection: api.IConnection,
) {
  // 1. Admin join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.shoppingmall.test/legal-holds",
    referrer: "https://admin.shoppingmall.test/login",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  const targetType = "order" as const;

  // 2. Create a legal hold with status we label as "draft"
  const draftCode: string = `LH-${RandomGenerator.alphaNumeric(12)}`;
  const draftCreateBody = {
    code: draftCode,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "draft",
    scope_description: RandomGenerator.paragraph({ sentences: 4 }),
    external_reference: RandomGenerator.alphaNumeric(16),
    effective_from: null,
  } satisfies IShoppingMallLegalHold.ICreate;

  const draftHold = await api.functional.shoppingMall.admin.legalHolds.create(
    connection,
    {
      body: draftCreateBody,
    },
  );
  typia.assert<IShoppingMallLegalHold>(draftHold);
  TestValidator.equals(
    "draft legal hold code matches request",
    draftHold.code,
    draftCode,
  );

  // 3. Create a target under the draft legal hold
  const draftTargetBody = {
    target_type: targetType,
    target_id: typia.random<string & tags.Format<"uuid">>(),
    target_display: RandomGenerator.paragraph({ sentences: 2 }),
    note: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallLegalHoldTarget.ICreate;

  const draftTarget =
    await api.functional.shoppingMall.admin.legalHolds.targets.create(
      connection,
      {
        legalHoldCode: draftHold.code,
        body: draftTargetBody,
      },
    );
  typia.assert<IShoppingMallLegalHoldTarget>(draftTarget);

  TestValidator.predicate(
    "draft target has a non-empty legal hold foreign key",
    draftTarget.shopping_mall_legal_hold_id.length > 0,
  );

  // 4. Delete the draft target (happy path: should succeed without error)
  await api.functional.shoppingMall.admin.legalHolds.targets.erase(connection, {
    legalHoldCode: draftHold.code,
    legalHoldTargetId: draftTarget.id,
  });

  TestValidator.predicate(
    "erase on draft legal hold target completed without throwing",
    true,
  );

  // 5. Create another legal hold with a different status we label as "active"
  const activeCode: string = `LH-${RandomGenerator.alphaNumeric(12)}`;
  const activeCreateBody = {
    code: activeCode,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "active",
    scope_description: RandomGenerator.paragraph({ sentences: 4 }),
    external_reference: RandomGenerator.alphaNumeric(16),
    effective_from: null,
  } satisfies IShoppingMallLegalHold.ICreate;

  const activeHold = await api.functional.shoppingMall.admin.legalHolds.create(
    connection,
    {
      body: activeCreateBody,
    },
  );
  typia.assert<IShoppingMallLegalHold>(activeHold);
  TestValidator.equals(
    "active legal hold code matches request",
    activeHold.code,
    activeCode,
  );

  const activeTargetBody = {
    target_type: targetType,
    target_id: typia.random<string & tags.Format<"uuid">>(),
    target_display: RandomGenerator.paragraph({ sentences: 2 }),
    note: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallLegalHoldTarget.ICreate;

  const activeTarget =
    await api.functional.shoppingMall.admin.legalHolds.targets.create(
      connection,
      {
        legalHoldCode: activeHold.code,
        body: activeTargetBody,
      },
    );
  typia.assert<IShoppingMallLegalHoldTarget>(activeTarget);

  TestValidator.predicate(
    "active target has a non-empty legal hold foreign key",
    activeTarget.shopping_mall_legal_hold_id.length > 0,
  );

  // 6. Delete the active target as well (second happy path)
  await api.functional.shoppingMall.admin.legalHolds.targets.erase(connection, {
    legalHoldCode: activeHold.code,
    legalHoldTargetId: activeTarget.id,
  });

  TestValidator.predicate(
    "erase on active legal hold target completed without throwing",
    true,
  );
}
