import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequestReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestReason";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRefundRequestReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestReason";

export async function test_api_admin_refund_request_reason_search_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Admin onboarding & authentication via /auth/admin/join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://shoppingmall.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create several refund request reasons with varying flags
  const reasons: IShoppingMallRefundRequestReason[] = [];
  const baseCodePrefix = `e2e_refund_reason_${RandomGenerator.alphaNumeric(8)}`;

  const createReason = async (
    index: number,
    flags: {
      applies_to_cancellation: boolean;
      applies_to_refund: boolean;
      is_active: boolean;
    },
  ) => {
    const body = {
      code: `${baseCodePrefix}_${index}`,
      name: RandomGenerator.paragraph({ sentences: 2 }),
      description:
        index % 2 === 0 ? RandomGenerator.paragraph({ sentences: 3 }) : null,
      applies_to_cancellation: flags.applies_to_cancellation,
      applies_to_refund: flags.applies_to_refund,
      is_active: flags.is_active,
    } satisfies IShoppingMallRefundRequestReason.ICreate;

    const created =
      await api.functional.shoppingMall.admin.refundRequestReasons.create(
        connection,
        {
          body,
        },
      );
    typia.assert<IShoppingMallRefundRequestReason>(created);
    reasons.push(created);
  };

  // Ensure at least 3 reasons and at least one active reason
  await createReason(1, {
    applies_to_cancellation: true,
    applies_to_refund: true,
    is_active: true,
  });
  await createReason(2, {
    applies_to_cancellation: false,
    applies_to_refund: true,
    is_active: true,
  });
  await createReason(3, {
    applies_to_cancellation: true,
    applies_to_refund: false,
    is_active: false,
  });

  const activeReasons = reasons.filter((r) => r.is_active);
  TestValidator.predicate(
    "there should be at least one active refund request reason created",
    activeReasons.length > 0,
  );

  // 3. Search with basic pagination and default-style filters
  const limit = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
  } satisfies IShoppingMallRefundRequestReason.IRequest;

  const pageResult =
    await api.functional.shoppingMall.admin.refundRequestReasons.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IPageIShoppingMallRefundRequestReason.ISummary>(pageResult);

  const { pagination, data } = pageResult;

  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page should be 1",
    pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should equal requested limit",
    pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination records should be at least number of created reasons",
    pagination.records >= (reasons.length as number),
  );
  TestValidator.predicate(
    "pagination pages should be at least 1",
    pagination.pages >= (1 as number),
  );

  // 5. Validate data contents for active reasons
  for (const reason of activeReasons) {
    const summary = data.find((item) => item.id === reason.id);

    TestValidator.predicate(
      `active reason with id ${reason.id} should be present in search result`,
      summary !== undefined,
    );

    if (summary !== undefined) {
      TestValidator.equals(
        `summary id should match reason id for ${reason.id}`,
        summary.id,
        reason.id,
      );
      TestValidator.equals(
        `summary code should match created reason code for ${reason.id}`,
        summary.code,
        reason.code,
      );
      TestValidator.equals(
        `summary name should match created reason name for ${reason.id}`,
        summary.name,
        reason.name,
      );
      TestValidator.equals(
        `summary applies_to_cancellation should match for ${reason.id}`,
        summary.applies_to_cancellation,
        reason.applies_to_cancellation,
      );
      TestValidator.equals(
        `summary applies_to_refund should match for ${reason.id}`,
        summary.applies_to_refund,
        reason.applies_to_refund,
      );
      TestValidator.equals(
        `summary is_active should match for ${reason.id}`,
        summary.is_active,
        reason.is_active,
      );
    }
  }
}
