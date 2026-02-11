import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityKarma";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityKarma";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_karma_index_all_records(
  connection: api.IConnection,
) {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
      } satisfies ICommunityAdmin.IJoin,
    },
  );
  // 2. Retrieve karma index with default filters
  const output: IPageICommunityKarma.ISummary =
    await api.functional.community.admin.karmas.index(adminConnection, {
      body: {} satisfies ICommunityKarma.IRequest,
    });
  typia.assert(output);
  // 3. Verify pagination metadata
  TestValidator.predicate(
    "pagination current ≥ 1",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit 1-100",
    output.pagination.limit >= 1 && output.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records ≥ 0",
    output.pagination.records >= 0,
  );
  TestValidator.predicate("pagination pages ≥ 0", output.pagination.pages >= 0);
  // 4. Verify minimal user profile in data entries
  if (output.data.length > 0) {
    const firstEntry = output.data[0];
    TestValidator.predicate(
      "karma score is number",
      typeof firstEntry.score === "number",
    );
    TestValidator.predicate(
      "user display_name exists",
      firstEntry.user.display_name !== undefined,
    );
    TestValidator.predicate(
      "user avatar_url exists",
      firstEntry.user.avatar_url !== undefined,
    );
  }
}
