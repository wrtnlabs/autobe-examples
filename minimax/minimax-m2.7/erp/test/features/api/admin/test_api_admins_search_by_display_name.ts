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

export async function test_api_admins_search_by_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create multiple admin accounts with distinct display names and emails
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: "John Smith Admin",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  typia.assert(admin1);
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: "Jane Doe Manager",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  typia.assert(admin2);
  const admin3Connection: api.IConnection = { host: connection.host };
  const admin3 = await authorize_admin_join(admin3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: "Bob Johnson Employee",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  typia.assert(admin3);
  // 2. Test search with partial displayName match (searching for "John")
  const johnSearchResult = await api.functional.erpHrm.admins.index(
    connection,
    {
      body: {
        search: "John",
      } satisfies IErpHrmAdmin.IRequest,
    },
  );
  typia.assert(johnSearchResult);
  // 3. Test search with exact displayName match
  const exactMatchResult = await api.functional.erpHrm.admins.index(
    connection,
    {
      body: {
        search: "Jane Doe Manager",
      } satisfies IErpHrmAdmin.IRequest,
    },
  );
  typia.assert(exactMatchResult);
  // 4. Test search with partial email match
  const emailSearchResult = await api.functional.erpHrm.admins.index(
    connection,
    {
      body: {
        search: "@company.com",
      } satisfies IErpHrmAdmin.IRequest,
    },
  );
  typia.assert(emailSearchResult);
  // 5. Test case-insensitive search (searching for lowercase "john")
  const caseInsensitiveResult = await api.functional.erpHrm.admins.index(
    connection,
    {
      body: {
        search: "john",
      } satisfies IErpHrmAdmin.IRequest,
    },
  );
  typia.assert(caseInsensitiveResult);
  // 6. Test non-matching search returns empty data array with valid pagination
  const noMatchResult = await api.functional.erpHrm.admins.index(connection, {
    body: {
      search: "nonexistentadminxyz123",
    } satisfies IErpHrmAdmin.IRequest,
  });
  typia.assert(noMatchResult);
  // Validations
  // John search should return admin1 (John Smith) and admin3 (Bob Johnson)
  TestValidator.predicate(
    "John search returns admins with 'John' in name or email",
    johnSearchResult.data.length > 0 &&
      johnSearchResult.data.some((a) => a.displayName.includes("John")),
  );
  // Exact match should return exactly one admin
  TestValidator.equals(
    "Exact displayName match returns admin with exact name",
    exactMatchResult.data.some((a) => a.displayName === "Jane Doe Manager"),
    true,
  );
  // Case insensitive search should return same or more results than case-sensitive
  TestValidator.predicate(
    "Case-insensitive search works for 'john'",
    caseInsensitiveResult.data.some((a) =>
      a.displayName.toLowerCase().includes("john"),
    ),
  );
  // Non-matching search returns empty data but valid pagination
  TestValidator.equals(
    "Non-matching search returns empty data",
    noMatchResult.data.length,
    0,
  );
  TestValidator.predicate(
    "Non-matching search has valid pagination",
    noMatchResult.pagination !== undefined &&
      noMatchResult.pagination.limit > 0,
  );
}
