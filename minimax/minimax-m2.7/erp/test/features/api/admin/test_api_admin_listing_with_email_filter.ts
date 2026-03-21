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

export async function test_api_admin_listing_with_email_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create first admin account for listing test
  const adminConnection1: api.IConnection = { host: connection.host };
  const firstAdmin = await authorize_admin_join(adminConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(firstAdmin);
  // Create second admin account with different email
  const adminConnection2: api.IConnection = { host: connection.host };
  const secondAdmin = await authorize_admin_join(adminConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(secondAdmin);
  // Query admins list with email filter - filter by first admin's email
  const adminsList = await api.functional.erpHrm.admin.admins.index(
    adminConnection1,
    {
      body: {
        email: firstAdmin.email,
      },
    },
  );
  typia.assert(adminsList);
  // Verify the response contains only admins matching the email pattern
  TestValidator.equals(
    "data array exists",
    Array.isArray(adminsList.data),
    true,
  );
  TestValidator.predicate(
    "contains first admin matching email filter",
    adminsList.data.some((admin) => admin.id === firstAdmin.id),
  );
  // Verify pagination metadata is correctly returned
  TestValidator.predicate("pagination exists", adminsList.pagination !== null);
  TestValidator.predicate(
    "pagination has current page",
    adminsList.pagination.current !== undefined,
  );
  TestValidator.predicate(
    "pagination has limit",
    adminsList.pagination.limit !== undefined,
  );
  TestValidator.predicate(
    "pagination has records count",
    adminsList.pagination.records !== undefined,
  );
  TestValidator.predicate(
    "pagination has pages count",
    adminsList.pagination.pages !== undefined,
  );
}
