import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_list_filtered_by_email_and_sorted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register a super administrator with a distinctive email
  const uniqueSubstring = "uniquetest";
  const distinctiveEmail =
    `${uniqueSubstring}${RandomGenerator.alphaNumeric(8)}@example.com` as string &
      tags.Format<"email">;
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: distinctiveEmail,
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Step A: Email partial search (lowercase substring)
  const stepAResult = await api.functional.shoppingMall.superAdmin.admins.index(
    superAdminConnection,
    {
      body: {
        email: uniqueSubstring,
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(stepAResult);
  // Validations for Step A
  TestValidator.predicate(
    "pagination.records >= 1 after email partial search",
    stepAResult.pagination.records >= 1,
  );
  TestValidator.predicate(
    "registered super admin email is in results",
    stepAResult.data.some(
      (admin) => admin.email.toLowerCase() === distinctiveEmail.toLowerCase(),
    ),
  );
  for (const admin of stepAResult.data) {
    TestValidator.predicate(
      "all returned emails contain the search substring (case-insensitive)",
      admin.email.toLowerCase().includes(uniqueSubstring.toLowerCase()),
    );
  }
  // Step A (case-insensitive verification): Search with UPPERCASE substring
  const upperSubstring = uniqueSubstring.toUpperCase();
  const stepAUpperResult =
    await api.functional.shoppingMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          email: upperSubstring,
        } satisfies IShoppingMallAdmin.IRequest,
      },
    );
  typia.assert(stepAUpperResult);
  TestValidator.predicate(
    "case-insensitive: records >= 1 when searching with uppercase substring",
    stepAUpperResult.pagination.records >= 1,
  );
  TestValidator.predicate(
    "case-insensitive: registered admin found with uppercase search",
    stepAUpperResult.data.some(
      (admin) => admin.email.toLowerCase() === distinctiveEmail.toLowerCase(),
    ),
  );
  // Step B: Email search with no match
  const stepBResult = await api.functional.shoppingMall.superAdmin.admins.index(
    superAdminConnection,
    {
      body: {
        email: "zzznomatchxyz999",
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(stepBResult);
  // Validations for Step B
  TestValidator.equals(
    "no-match: data array is empty",
    stepBResult.data.length,
    0,
  );
  TestValidator.equals(
    "no-match: pagination.records is 0",
    stepBResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "no-match: pagination.pages is 0",
    stepBResult.pagination.pages,
    0,
  );
  // Step C: Sorting by email ascending with limit 10
  const stepCResult = await api.functional.shoppingMall.superAdmin.admins.index(
    superAdminConnection,
    {
      body: {
        sortBy: "email",
        sortOrder: "asc",
        limit: 10,
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(stepCResult);
  // Validations for Step C
  TestValidator.equals(
    "sort asc: pagination.limit is 10",
    stepCResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "sort asc: pagination.current is 1",
    stepCResult.pagination.current,
    1,
  );
  // Verify non-decreasing order of emails
  if (stepCResult.data.length > 1) {
    for (let i = 0; i < stepCResult.data.length - 1; i++) {
      TestValidator.predicate(
        `sort asc: email[${i}] <= email[${i + 1}]`,
        stepCResult.data[i]!.email.toLowerCase() <=
          stepCResult.data[i + 1]!.email.toLowerCase(),
      );
    }
  }
}
