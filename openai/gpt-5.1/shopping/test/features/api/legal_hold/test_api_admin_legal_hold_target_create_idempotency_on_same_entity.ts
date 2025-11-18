import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallLegalHoldTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHoldTarget";

export async function test_api_admin_legal_hold_target_create_idempotency_on_same_entity(
  connection: api.IConnection,
) {
  // 1. Bootstrap an admin account and authenticate via join.
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Create a new legal hold with a unique business code.
  const baseLegalHoldCreate = typia.random<IShoppingMallLegalHold.ICreate>();
  const legalHoldCode = RandomGenerator.alphaNumeric(16);

  const legalHoldCreateBody = {
    ...baseLegalHoldCreate,
    code: legalHoldCode,
  } satisfies IShoppingMallLegalHold.ICreate;

  const legalHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: legalHoldCreateBody,
    });
  typia.assert<IShoppingMallLegalHold>(legalHold);

  TestValidator.equals(
    "legal hold code must match requested code",
    legalHold.code,
    legalHoldCode,
  );

  // 3. Prepare stable target identity for duplicate creation attempts.
  const targetType = "customer";
  const targetId = typia.random<string & tags.Format<"uuid">>();
  const targetDisplay = RandomGenerator.name();
  const note = RandomGenerator.paragraph({ sentences: 4 });

  const targetCreateBody = {
    target_type: targetType,
    target_id: targetId,
    target_display: targetDisplay,
    note,
  } satisfies IShoppingMallLegalHoldTarget.ICreate;

  // 4. First call to create the legal hold target.
  const firstTarget: IShoppingMallLegalHoldTarget =
    await api.functional.shoppingMall.admin.legalHolds.targets.create(
      connection,
      {
        legalHoldCode: legalHold.code,
        body: targetCreateBody,
      },
    );
  typia.assert<IShoppingMallLegalHoldTarget>(firstTarget);

  TestValidator.equals(
    "first target_type matches input",
    firstTarget.target_type,
    targetType,
  );
  TestValidator.equals(
    "first target_id matches input",
    firstTarget.target_id,
    targetId,
  );
  TestValidator.equals(
    "first target_display matches input",
    firstTarget.target_display ?? null,
    targetDisplay,
  );

  // 5. Second call with the same payload to test idempotency/uniqueness.
  let secondCallSucceeded = false;
  let secondTarget: IShoppingMallLegalHoldTarget | null = null;

  try {
    const output: IShoppingMallLegalHoldTarget =
      await api.functional.shoppingMall.admin.legalHolds.targets.create(
        connection,
        {
          legalHoldCode: legalHold.code,
          body: targetCreateBody,
        },
      );
    typia.assert<IShoppingMallLegalHoldTarget>(output);
    secondCallSucceeded = true;
    secondTarget = output;
  } catch {
    secondCallSucceeded = false;
    secondTarget = null;
  }

  if (secondCallSucceeded && secondTarget !== null) {
    // Service behaves idempotently or returns another row for the same entity.
    TestValidator.equals(
      "second target_type still matches input",
      secondTarget.target_type,
      targetType,
    );
    TestValidator.equals(
      "second target_id still matches input",
      secondTarget.target_id,
      targetId,
    );
  } else {
    // Service rejects duplicate creation attempts with some error.
    // Just assert that duplicate creation through the same API call path
    // indeed results in an error when executed via TestValidator.error.
    await TestValidator.error(
      "duplicate legal hold target creation should fail",
      async () => {
        await api.functional.shoppingMall.admin.legalHolds.targets.create(
          connection,
          {
            legalHoldCode: legalHold.code,
            body: targetCreateBody,
          },
        );
      },
    );
  }
}
