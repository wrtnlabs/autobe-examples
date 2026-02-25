import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_admin_community_detail_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join (register and login) to get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuthorized);
  // Use the adminConnection updated internally by authorize_admin_join with Authorization header
  // 2. Retrieve a community detail using an existing valid community ID (random UUID used due to lack of creation utility)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const communityDetail =
    await api.functional.communityPlatform.admin.communities.at(
      adminConnection,
      {
        communityId,
      },
    );
  typia.assert(communityDetail);
  // 3. Validate subscriberCount is a number as per specification (DTO has boolean but spec says number)
  TestValidator.predicate(
    "subscriberCount is a number",
    typeof communityDetail.subscriberCount === "number",
  );
  // 4. Validate full community detail type correctness and no superfluous properties
  typia.assertGuardEquals<ICommunityPlatformCommunity>(communityDetail);
}
