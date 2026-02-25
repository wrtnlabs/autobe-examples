import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test searching administrator accounts with pagination.
 * 1. Create super administrator for search permissions
 * 2. Create multiple regular administrators for search results
 * 3. Authenticate as super administrator
 * 4. Search administrators with pagination
 * 5. Validate pagination metadata and administrator fields
 */
export async function test_api_admins_search_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create initial super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>() satisfies string as
      | string
      | null,
  } satisfies IDiscussionBoardSuperAdmin.IJoin;
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: superAdminCredentials,
  });
  typia.assert(superAdmin);
  // Step 2: Create multiple regular administrator accounts
  const adminCredentials = ArrayUtil.repeat(
    5,
    () =>
      ({
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      }) satisfies IDiscussionBoardAdmin.IJoin,
  );
  for (const cred of adminCredentials) {
    const adminConnection: api.IConnection = { host: connection.host };
    const admin = await authorize_admin_join(adminConnection, { body: cred });
    typia.assert(admin);
  }
  // Step 3: Authenticate as super administrator
  const searchConnection: api.IConnection = { host: connection.host };
  const loginCredentials = {
    email: superAdminCredentials.email,
    password: superAdminCredentials.password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>() satisfies string as
      | string
      | null,
  } satisfies IDiscussionBoardSuperAdmin.ILogin;
  const loggedInSuperAdmin = await authorize_super_admin_login(
    searchConnection,
    { body: loginCredentials },
  );
  typia.assert(loggedInSuperAdmin);
  // Step 4: Search administrators with pagination
  const page = 1 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> satisfies number as number;
  const limit = 10 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> satisfies number as number;
  const searchRequest = {
    page,
    limit,
  } satisfies IDiscussionBoardAdmin.IRequest;
  const searchResult = await api.functional.discussionBoard.admins.index(
    searchConnection,
    { body: searchRequest },
  );
  typia.assert(searchResult);
  // Step 5: Validate pagination metadata - Simplified validation
  // typia.assert already validates the entire structure including nested pagination
  // We'll validate that we got some results back
  TestValidator.predicate(
    "search result contains data array",
    Array.isArray(searchResult.data),
  );
  // Should have at least the super admin + 5 regular admins = 6 total
  // However, pagination limit is 10, so we should get all 6 on first page
  TestValidator.predicate(
    "should have at least 6 administrators total",
    searchResult.data.length >= 6,
  );
  // Step 6: Validate administrator fields in results
  for (const admin of searchResult.data) {
    typia.assert<IDiscussionBoardAdmin.ISummary>(admin);
    // Additional business logic validation if needed
    TestValidator.predicate(
      "admin should have required fields",
      admin.id !== undefined &&
        admin.email !== undefined &&
        admin.display_name !== undefined &&
        admin.created_at !== undefined,
    );
  }
}
