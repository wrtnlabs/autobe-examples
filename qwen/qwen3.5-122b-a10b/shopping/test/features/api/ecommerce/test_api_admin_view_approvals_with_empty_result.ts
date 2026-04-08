import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerApproval";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSellerApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_view_approvals_with_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Query approvals with filters that return no results
  // Use a future date range that won't match any existing records
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 10); // 10 years in future
  const emptyResult = await api.functional.ecommerce.admin.approvals.index(
    adminConnection,
    {
      body: {
        status: "pending",
        createdAtFrom: futureDate.toISOString() as string &
          tags.Format<"date-time">,
        createdAtTo: futureDate.toISOString() as string &
          tags.Format<"date-time">,
        page: 1,
        limit: 20,
      } satisfies IEcommerceSellerApproval.IRequest,
    },
  );
  typia.assert(emptyResult);
  // 3. Validate empty result structure
  TestValidator.equals("empty data array", emptyResult.data.length, 0);
  TestValidator.equals("zero records", emptyResult.pagination.records, 0);
  TestValidator.equals("zero pages", emptyResult.pagination.pages, 0);
  TestValidator.equals("current page", emptyResult.pagination.current, 1);
  TestValidator.equals("limit preserved", emptyResult.pagination.limit, 20);
}
