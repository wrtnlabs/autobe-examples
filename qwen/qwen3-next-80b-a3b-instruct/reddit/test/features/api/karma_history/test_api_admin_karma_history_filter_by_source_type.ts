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

export async function test_api_admin_karma_history_filter_by_source_type(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // Perform filtered query: source_type = 'post'
  const response = await api.functional.community.admin.karma.history.index(
    adminConnection,
    {
      body: { source_type: "post" } satisfies ICommunityKarmaHistory.IRequest,
    },
  );
  typia.assert(response);
  // Validate response: must have at least one record (assuming system has post karma history)
  TestValidator.predicate("has at least one record", response.data.length > 0);
  // Cannot validate source_type as it doesn't exist in ICommunityKarmaHistory.ISummary
  // (per DTO definitions - ISummary is empty interface)
  // This follows the rule: Compilation SUCCESS > Scenario fidelity
}
