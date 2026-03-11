import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEAdminGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEAdminGrade";
import type { IESortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortOrder";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestRequestStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequestStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_account_isolation_regular_admin_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create regular administrator account
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminResult = await authorize_admin_join(
    regularAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  typia.assert(regularAdminResult);
  // 2. Create super administrator account (to test isolation)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminResult = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 3. List admins as regular admin (using updated connection from step 1)
  const regularAdminListResult =
    await api.functional.ecommerceMall.admin.admins.index(
      regularAdminConnection,
      {
        body: {
          grade: "regular",
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(regularAdminListResult);
  // 4. Validate response structure
  TestValidator.equals(
    "pagination records count",
    regularAdminListResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination pages count",
    regularAdminListResult.pagination.pages,
    1,
  );
  // 5. Validate only one record in data array
  TestValidator.equals(
    "data array length",
    regularAdminListResult.data.length,
    1,
  );
  // 6. Validate returned admin matches requesting admin
  const returnedAdmin = regularAdminListResult.data[0];
  TestValidator.equals(
    "returned admin ID matches requesting admin",
    returnedAdmin.id,
    regularAdminResult.id,
  );
  TestValidator.equals(
    "returned admin email matches requesting admin",
    returnedAdmin.email,
    regularAdminResult.email,
  );
  // 7. Verify no super admin account appears in results
  const allAdminEmails = regularAdminListResult.data.map(
    (admin) => admin.email,
  );
  const superAdminEmailExists = allAdminEmails.includes(superAdminResult.email);
  TestValidator.equals(
    "super admin not visible to regular admin",
    superAdminEmailExists,
    false,
  );
}