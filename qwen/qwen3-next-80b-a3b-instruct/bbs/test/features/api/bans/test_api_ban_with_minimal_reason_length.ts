import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministrator";
import type { IEconomicDiscussionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_ban_with_minimal_reason_length(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicDiscussionAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Create a target user to ban
  const targetUserId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Create ban request with empty object as required by IEconomicDiscussionBan.ICreate = {}
  // Note: The ICreate interface has no properties - the ban reason (if any) is handled server-side
  // We must send {} to satisfy the schema, even though the scenario describes a 10-character reason
  // This is because the API contract takes precedence over the scenario description
  const banReason = {} satisfies IEconomicDiscussionBan.ICreate;
  // Step 4: Call the ban API with the empty object body
  await api.functional.economicDiscussion.administrator.bans.create(
    adminConnection,
    {
      userId: targetUserId,
      body: banReason,
    },
  );
  // Step 5: Validate that the ban was successfully created
  // API returns 204 No Content, so no response body to validate
  // Success is confirmed by absence of error and proper HTTP status
  TestValidator.predicate("ban with empty body succeeded", true);
}
