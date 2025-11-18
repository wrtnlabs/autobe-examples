import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallLegalHoldTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHoldTarget";

export async function test_api_legal_hold_target_not_found_for_mismatched_hold(
  connection: api.IConnection,
) {
  // 1. Admin joins and obtains authorization context
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
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create two distinct legal holds: HOLD-A and HOLD-B
  const codePrefix: string = RandomGenerator.alphaNumeric(8);
  const codeA: string = `${codePrefix}-A`;
  const codeB: string = `${codePrefix}-B`;

  const holdACreateBody = {
    code: codeA,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    description: null,
    scope_description: null,
    external_reference: null,
    effective_from: null,
  } satisfies IShoppingMallLegalHold.ICreate;

  const holdA: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: holdACreateBody,
    });
  typia.assert<IShoppingMallLegalHold>(holdA);

  const holdBCreateBody = {
    code: codeB,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    description: null,
    scope_description: null,
    external_reference: null,
    effective_from: null,
  } satisfies IShoppingMallLegalHold.ICreate;

  const holdB: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: holdBCreateBody,
    });
  typia.assert<IShoppingMallLegalHold>(holdB);

  // 3. Create a legal hold target under HOLD-A
  const targetCreateBody = {
    target_type: "order",
    target_id: typia.random<string & tags.Format<"uuid">>(),
    target_display: RandomGenerator.paragraph({ sentences: 2 }),
    note: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallLegalHoldTarget.ICreate;

  const targetA: IShoppingMallLegalHoldTarget =
    await api.functional.shoppingMall.admin.legalHolds.targets.create(
      connection,
      {
        legalHoldCode: codeA,
        body: targetCreateBody,
      },
    );
  typia.assert<IShoppingMallLegalHoldTarget>(targetA);

  // 4. Attempt to retrieve the same target ID under HOLD-B (mismatched hold)
  await TestValidator.error(
    "mismatched legalHoldCode should not expose target",
    async () => {
      await api.functional.shoppingMall.admin.legalHolds.targets.at(
        connection,
        {
          legalHoldCode: codeB,
          legalHoldTargetId: targetA.id,
        },
      );
    },
  );

  // 5. Positive control: retrieval under HOLD-A should succeed
  const readBack: IShoppingMallLegalHoldTarget =
    await api.functional.shoppingMall.admin.legalHolds.targets.at(connection, {
      legalHoldCode: codeA,
      legalHoldTargetId: targetA.id,
    });
  typia.assert<IShoppingMallLegalHoldTarget>(readBack);

  TestValidator.equals(
    "legal hold target id should match on successful lookup",
    readBack.id,
    targetA.id,
  );
}
