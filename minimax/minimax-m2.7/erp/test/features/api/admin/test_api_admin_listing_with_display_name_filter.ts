import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_listing_with_display_name_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection for setup
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Create admin with display name 'John Smith'
  const johnAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: "John Smith",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  typia.assert(johnAdmin);
  // 3. Create admin with display name 'Jane Doe'
  const janeAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: "Jane Doe",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  typia.assert(janeAdmin);
  // 4. Create admin with display name 'Johnny Walker'
  const johnnyAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: "Johnny Walker",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  typia.assert(johnnyAdmin);
  // 5. Create admin with display name 'Alice Johnson'
  const aliceAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: "Alice Johnson",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  typia.assert(aliceAdmin);
  // 6. Query with displayName filter 'John' (case-insensitive partial match)
  const johnFilterResult = await api.functional.erpHrm.admin.admins.index(
    adminConnection,
    {
      body: {
        displayName: "John",
        limit: 100,
      } satisfies IErpHrmAdmin.IRequest,
    },
  );
  typia.assert(johnFilterResult);
  // 7. Validate: response contains admins with display names containing 'John'
  const johnDisplayNames = johnFilterResult.data.map(
    (admin) => admin.display_name,
  );
  TestValidator.predicate(
    "result contains John Smith",
    johnDisplayNames.includes("John Smith"),
  );
  TestValidator.predicate(
    "result contains Johnny Walker",
    johnDisplayNames.includes("Johnny Walker"),
  );
  TestValidator.predicate(
    "result contains Alice Johnson",
    johnDisplayNames.includes("Alice Johnson"),
  );
  TestValidator.predicate(
    "result does not contain Jane Doe",
    !johnDisplayNames.includes("Jane Doe"),
  );
  // 8. Query with lowercase 'john' to test case-insensitivity
  const lowercaseJohnResult = await api.functional.erpHrm.admin.admins.index(
    adminConnection,
    {
      body: {
        displayName: "john",
        limit: 100,
      } satisfies IErpHrmAdmin.IRequest,
    },
  );
  typia.assert(lowercaseJohnResult);
  TestValidator.equals(
    "case-insensitive filter returns same count",
    lowercaseJohnResult.data.length,
    johnFilterResult.data.length,
  );
  // 9. Query with displayName filter 'Jane'
  const janeFilterResult = await api.functional.erpHrm.admin.admins.index(
    adminConnection,
    {
      body: {
        displayName: "Jane",
        limit: 100,
      } satisfies IErpHrmAdmin.IRequest,
    },
  );
  typia.assert(janeFilterResult);
  // 10. Validate: response contains only Jane Doe
  const janeDisplayNames = janeFilterResult.data.map(
    (admin) => admin.display_name,
  );
  TestValidator.predicate(
    "result contains Jane Doe",
    janeDisplayNames.includes("Jane Doe"),
  );
  TestValidator.equals(
    "result does not contain other Johns",
    janeFilterResult.data.filter((admin) => admin.display_name.includes("John"))
      .length,
    0,
  );
  // 11. Test combined filter: email + displayName
  const johnEmailPrefix = johnAdmin.email.split("@")[0].substring(0, 4);
  const combinedFilterResult = await api.functional.erpHrm.admin.admins.index(
    adminConnection,
    {
      body: {
        displayName: "John",
        email: johnEmailPrefix,
        limit: 100,
      } satisfies IErpHrmAdmin.IRequest,
    },
  );
  typia.assert(combinedFilterResult);
  // 12. Validate: all results contain 'John' in display_name AND email prefix
  for (const admin of combinedFilterResult.data) {
    TestValidator.predicate(
      `admin ${admin.display_name} contains 'John'`,
      admin.display_name.includes("John"),
    );
    TestValidator.predicate(
      `admin ${admin.email} contains email prefix '${johnEmailPrefix}'`,
      admin.email.startsWith(johnEmailPrefix),
    );
  }
  // 13. Test filter with no matches
  const noMatchResult = await api.functional.erpHrm.admin.admins.index(
    adminConnection,
    {
      body: {
        displayName: "NonExistentName12345",
        limit: 100,
      } satisfies IErpHrmAdmin.IRequest,
    },
  );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "no match result should have zero data",
    noMatchResult.data.length,
    0,
  );
  // 14. Test pagination with displayName filter
  const paginatedResult = await api.functional.erpHrm.admin.admins.index(
    adminConnection,
    {
      body: {
        displayName: "John",
        limit: 2,
        page: 1,
      } satisfies IErpHrmAdmin.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "paginated result has limit applied",
    paginatedResult.data.length <= 2,
  );
  TestValidator.equals(
    "pagination current page is 1",
    paginatedResult.pagination.current,
    1,
  );
}
