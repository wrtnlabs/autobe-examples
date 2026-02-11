import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityFeedView";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_feed_view_detail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create a member connection for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberProfile = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberProfile);
  // Create the member-specific connection with token
  const memberTokenConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${memberProfile.token.access}`,
    },
  };
  // Create a community feed view using the member connection
  const feedView = await api.functional.redditPlatform.community_views.at(
    memberTokenConnection,
    {
      viewId: typia.random<string>(),
    },
  );
  typia.assert(feedView);
  // Validate community information
  TestValidator.predicate("community has valid id", () =>
    /^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(feedView.community.id),
  );
  TestValidator.predicate(
    "community has name",
    () => feedView.community.name.length > 0,
  );
}
