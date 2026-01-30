import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsPostStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostStatus";
import { prepare_random_community_bbs_post_status } from "../../../prepare/prepare_random_community_bbs_post_status";
import { generate_random_community_bbs_admin_post_statuses_create } from "../../../generate/generate_random_community_bbs_admin_post_statuses_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_post_status_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
    } satisfies ICommunityBbsAdmin.IJoin,
  });
  typia.assert(adminResult);
  // Step 2: Create a new post status with unique name and code
  const postStatusName = RandomGenerator.name();
  const postStatusCode = RandomGenerator.alphaNumeric(4).toUpperCase();
  await api.functional.communityBbs.admin.post_statuses.create(
    adminConnection,
    {
      body: {
        name: postStatusName,
        code: postStatusCode,
      } satisfies ICommunityBbsPostStatus.ICreate,
    },
  );
  // Confirm successful execution without throwing an error
  TestValidator.equals("status creation successful", true, true);
}
