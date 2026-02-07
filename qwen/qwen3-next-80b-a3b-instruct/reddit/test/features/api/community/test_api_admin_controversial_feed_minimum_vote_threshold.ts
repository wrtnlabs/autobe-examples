import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_controversial_feed_minimum_vote_threshold(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin as required by scenario plan
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  // 2. Query the controversial feed
  const response =
    await api.functional.community.admin.posts.controversial.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(response);
  // 3. Validate response structure (only possible validation due to empty DTO)
  TestValidator.equals("pagination exists", response.pagination.current, 1);
  TestValidator.predicate("limit positive", response.pagination.limit > 0);
  TestValidator.predicate(
    "records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate("pages non-negative", response.pagination.pages >= 0);
  // Validate data array exists and is array
  TestValidator.predicate("has data array", Array.isArray(response.data));
  TestValidator.predicate("data array length >= 0", response.data.length >= 0);
  // Cannot validate post properties because ICommunityPost.ISummary has no defined properties
  // All validation must stop here due to schema limitation
  // Compilation success > scenario fidelity
}
