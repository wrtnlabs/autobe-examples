import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministrator";
import type { IEconomicDiscussionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicDiscussionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionBan";
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

export async function test_api_administrator_ban_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicDiscussionAdministrator.IJoin,
  });
  // Step 2: Create user account to be banned
  const userConnection: api.IConnection = { host: connection.host };
  const user = await api.functional.economicDiscussion.auth.administrator.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEconomicDiscussionAdministrator.IJoin,
    },
  );
  typia.assert(user);
  // Step 3: Ban the user
  await generate_random_economic_discussion_administrator_bans_create(
    adminConnection,
    {
      params: {
        userId: user.id,
      },
      body: {} satisfies IEconomicDiscussionBan.ICreate,
    },
  );
  // Step 4: Retrieve ban list
  const banList: IPageIEconomicDiscussionBan.ISummary =
    await api.functional.economicDiscussion.administrator.bans.get(
      adminConnection,
    );
  typia.assert(banList);
  // Step 5: Validate ban list structure and ordering
  TestValidator.equals(
    "pagination information exists",
    banList.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is positive",
    banList.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination records count is positive",
    banList.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages count is non-negative",
    banList.pagination.pages >= 0,
    true,
  );
  TestValidator.equals(
    "has at least one banned user",
    banList.data.length > 0,
    true,
  );
  TestValidator.equals(
    "banned user ID exists",
    banList.data[0].banned_user_id.length > 0,
    true,
  );
  TestValidator.equals(
    "banned by admin ID exists",
    banList.data[0].banned_by_admin_id.length > 0,
    true,
  );
  TestValidator.predicate(
    "ban reason has valid length",
    banList.data[0].reason.length >= 10 && banList.data[0].reason.length <= 500,
  );
  // Validation of date-time formats is handled by typia.assert() and is guaranteed by system
  // No additional regex validation needed (prohibited pattern)
  // Step 6: Verify unauthorized access fails
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthorized user cannot access ban list",
    async () => {
      await api.functional.economicDiscussion.administrator.bans.get(
        guestConnection,
      );
    },
  );
}