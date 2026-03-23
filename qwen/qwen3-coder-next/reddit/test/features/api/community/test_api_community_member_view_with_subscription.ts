import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_member_view_with_subscription(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. View community (using generated name)
  const communityName = RandomGenerator.alphaNumeric(8);
  const viewResult = await api.functional.redditLike.communities.at(
    memberConnection,
    { name: communityName },
  );
  typia.assert(viewResult);
  // 3. Validate response structure
  TestValidator.equals(
    "community name matches",
    viewResult.name,
    communityName,
  );
  TestValidator.predicate(
    "has subscriber count",
    typeof viewResult.subscriber_count === "number",
  );
  TestValidator.predicate(
    "owner exists",
    viewResult.owner !== null && viewResult.owner !== undefined,
  );
  TestValidator.predicate(
    "has ID format",
    /^[0-9a-f-]{36}$/i.test(viewResult.id),
  );
}
