import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_community_moderator_community_moderators_list_filtered_by_username_and_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator by join
  const moderatorConnection: api.IConnection = { host: connection.host };
  const joinBody = {} satisfies ICommunityPlatformModerator.IJoin;
  const auth = await authorize_moderator_join(moderatorConnection, {
    body: joinBody,
  });
  moderatorConnection.headers = {
    Authorization: `Bearer ${auth.token.access}`,
  };
  // 2. Prepare filter criteria
  // Generate random partially plausible username substring
  const usernameSubstring = RandomGenerator.alphabets(3);
  // Define possible roles
  const roles = ["owner", "moderator"] as const;
  const role = RandomGenerator.pick(roles);
  // 3. Request filtered list of community moderators
  const response =
    await api.functional.communityPlatform.moderator.communityModerators.index(
      moderatorConnection,
      {
        body: {
          username: usernameSubstring,
          role: role,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate pagination metadata
  const pagination = response.pagination;
  TestValidator.predicate("current page is positive", pagination.current > 0);
  TestValidator.predicate("limit is positive", pagination.limit > 0);
  TestValidator.predicate("pages is non-negative", pagination.pages >= 0);
  TestValidator.predicate("records is non-negative", pagination.records >= 0);
  // 5. Cannot validate item properties since none exist in schema
  // So no checks on username substring or role on data items
}
