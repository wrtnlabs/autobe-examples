import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityKarma";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_karma_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies ICommunityAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // 2. Retrieve karma record for a specific user
  const userId = typia.random<string & tags.Format<"uuid">>();
  const karma = await api.functional.community.admin.karmas.at(
    adminConnection,
    {
      userId,
    },
  );
  typia.assert(karma);
  // 3. Validate response content
  TestValidator.equals("karma score", karma.score, 0);
  TestValidator.predicate(
    "karma score should be number",
    typeof karma.score === "number",
  );
  TestValidator.equals("karma created_at", typeof karma.created_at, "string");
  TestValidator.equals("karma updated_at", typeof karma.updated_at, "string");
  TestValidator.equals(
    "karma deleted_at",
    typeof karma.deleted_at === "string" || karma.deleted_at === null,
    true,
  );
}
