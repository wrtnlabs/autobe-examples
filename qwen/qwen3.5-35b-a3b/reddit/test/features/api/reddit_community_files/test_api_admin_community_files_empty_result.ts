import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityFile";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_community_files_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Prepare a community with no files
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. List files for community with no files (empty result scenario)
  // Explicitly set pagination to defaults to ensure clean empty result test
  const response =
    await api.functional.redditCommunity.admin.communities.files.index(
      adminConnection,
      {
        communityId,
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditCommunityCommunityFile.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate empty results are handled correctly
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 20", response.pagination.limit, 20);
  TestValidator.equals(
    "pagination total records is 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination total pages is 0",
    response.pagination.pages,
    0,
  );
  TestValidator.equals("response data array is empty", response.data.length, 0);
}
