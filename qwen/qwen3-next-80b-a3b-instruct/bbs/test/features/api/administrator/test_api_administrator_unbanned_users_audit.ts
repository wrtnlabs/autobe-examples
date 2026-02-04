import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministrator";
import type { IEconomicDiscussionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionBan";
import type { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionCitizen";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_economic_discussion_administrator_bans_create } from "../../../generate/generate_random_economic_discussion_administrator_bans_create";
import { prepare_random_economic_discussion_ban } from "../../../prepare/prepare_random_economic_discussion_ban";

export async function test_api_administrator_unbanned_users_audit(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authorize a new administrator account to perform unbanning operations
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies IEconomicDiscussionAdministrator.IJoin;
  const admin = await authorize_administrator_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(admin);
  // Step 2: Create and authorize a citizen account to be banned and later unban
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies IEconomicDiscussionAdministrator.IJoin;
  const citizen = await authorize_administrator_join(citizenConnection, {
    body: citizenCredentials,
  });
  typia.assert(citizen);
  // Step 3: Ban the citizen using the administrator connection
  await api.functional.economicDiscussion.administrator.bans.create(
    adminConnection,
    {
      userId: citizen.id,
      body: {} satisfies IEconomicDiscussionBan.ICreate,
    },
  );
  // Step 4: Unban the previously banned citizen to create an unbanning audit record
  await api.functional.economicDiscussion.administrator.unbans.unban(
    adminConnection,
  );
  // Step 5: Audit the unbanned users list with connection-specific configuration
  const auditResponse: IPageIEconomicDiscussionCitizen.ISummary =
    await api.functional.economicDiscussion.administrator.unbans.index(
      adminConnection,
      {
        body: {
          // Test filtering by the username of the unbanned citizen
          username: citizenCredentials.email.split("@")[0], // Use original credentials email instead of citizen.email
          // Test filtering by unbanning date range
          unbannedAtRange: {
            from: new Date().toISOString(),
            to: new Date(Date.now() + 86400000).toISOString(), // Within next 24 hours
          },
          // Test filtering by unbanning admin ID
          unbanningAdminId: admin.id, // Use the admin ID who performed the unban
          // Test cursor-based pagination with empty cursor to get first page
          cursor: undefined,
        } satisfies IEconomicDiscussionCitizen.IRequest,
      },
    );
  // Step 6: Validate the audit response structure
  typia.assert(auditResponse);
  // Step 7: Validate pagination metadata
  TestValidator.equals(
    "pagination should exist",
    auditResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination current should be at least 1",
    auditResponse.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "pagination limit should be positive",
    auditResponse.pagination.limit > 0,
    true,
  );
  TestValidator.predicate(
    "pagination records should be at least 1",
    auditResponse.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages should be at least 1",
    auditResponse.pagination.pages >= 1,
  );
  // Step 8: Validate that at least one unbanned record exists
  TestValidator.predicate(
    "should have at least one unbanned user",
    auditResponse.data.length >= 1,
  );
  // Step 9: Validate that the unbanned record matches the expected citizen
  const unbannedUser = auditResponse.data[0];
  TestValidator.equals(
    "first unbanned user ID matches",
    unbannedUser.id,
    citizen.id,
  );
}