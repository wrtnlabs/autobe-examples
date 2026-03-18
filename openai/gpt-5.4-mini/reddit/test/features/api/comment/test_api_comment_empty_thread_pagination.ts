import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_comment_empty_thread_pagination(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphabets(8)}@test.com`,
      password: `P@ssw0rd_${RandomGenerator.alphabets(8)}`,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const page = 1;
  const limit = 20;
  const output = await api.functional.communityPlatform.admin.comments.index(
    adminConnection,
    {
      body: {
        page,
        limit,
      } satisfies ICommunityPlatformComment.IRequest,
    },
  );
  typia.assert(output);
  TestValidator.equals("empty thread data", output.data, []);
  TestValidator.equals("pagination current", output.pagination.current, page);
  TestValidator.equals("pagination limit", output.pagination.limit, limit);
  TestValidator.equals("pagination records", output.pagination.records, 0);
  TestValidator.equals("pagination pages", output.pagination.pages, 0);
  TestValidator.equals("empty thread length", output.data.length, 0);
}
