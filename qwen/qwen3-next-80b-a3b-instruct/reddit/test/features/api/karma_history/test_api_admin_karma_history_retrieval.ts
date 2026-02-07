import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityKarmaHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityKarmaHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_karma_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate admin account to access protected karma history endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // Retrieve karma history with default pagination (20 entries)
  const history = await api.functional.community.admin.karma.history.index(
    adminConnection,
    {
      body: typia.random<ICommunityKarmaHistory.IRequest>(),
    },
  );
  typia.assert(history);
  // Validate pagination metadata with actual expectations
  TestValidator.equals("default page is 1", history.pagination.current, 1);
  TestValidator.equals("default limit is 20", history.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    history.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    history.pagination.pages >= 0,
  );
  // Validate data array structure
  TestValidator.predicate("data is an array", Array.isArray(history.data));
  TestValidator.predicate(
    "data length is at most 20",
    history.data.length <= 20,
  );
  TestValidator.predicate(
    "data has at least one entry if records > 0",
    history.pagination.records === 0 || history.data.length > 0,
  );
  // Validate each karma history entry
  for (const entry of history.data) {
    // Entry should be an object, not null or undefined
    TestValidator.predicate(
      "entry is an object",
      entry !== null && typeof entry === "object",
    );
  }
}
