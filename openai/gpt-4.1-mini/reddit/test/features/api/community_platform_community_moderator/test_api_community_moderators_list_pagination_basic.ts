import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
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

export async function test_api_community_moderators_list_pagination_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join and authorization
  const moderatorConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      displayName: null,
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(auth);
  moderatorConnection.headers = { Authorization: auth.token.access };
  // 2. Send PATCH request with empty pagination request (defaults)
  const reqBody: ICommunityPlatformCommunityModerator.IRequest = {};
  const output = await api.functional.communityPlatform.moderators.index(
    moderatorConnection,
    { body: reqBody },
  );
  typia.assert(output);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page >= 1",
    output.pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit > 0", output.pagination.limit > 0);
  TestValidator.predicate(
    "pagination records >= data length",
    output.pagination.records >= output.data.length,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    output.pagination.pages >= 0,
  );
  // 4. Validate data contents
  for (const item of output.data) {
    typia.assert(item);
    // Validate community moderator id and role presence
    TestValidator.predicate(
      "item.id is valid uuid",
      /^[0-9a-fA-F-]{36}$/.test(item.id),
    );
    TestValidator.predicate(
      "item.role is owner or moderator",
      ["owner", "moderator"].includes(item.role),
    );
    // Validate community id presence
    TestValidator.predicate(
      "community.id is valid uuid",
      /^[0-9a-fA-F-]{36}$/.test(item.community.id),
    );
    // Validate communityModerator.id presence
    {
      const communityModerator = item.communityModerator as any;
      TestValidator.predicate(
        "communityModerator.id is valid uuid",
        typeof communityModerator?.id === "string" && /^[0-9a-fA-F-]{36}$/.test(communityModerator.id),
      );
    }
  }
}
