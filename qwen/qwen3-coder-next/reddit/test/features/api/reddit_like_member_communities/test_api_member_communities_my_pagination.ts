import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
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

export async function test_api_member_communities_my_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  // Retrieve paginated communities
  const result =
    await api.functional.redditLike.member.communities.my.index(
      memberConnection,
    );
  typia.assert(result);
  // Validate pagination structure
  TestValidator.predicate(
    "has pagination info",
    result.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(result.data));
  // Validate pagination fields are non-negative integers
  TestValidator.predicate("current page >= 0", result.pagination.current >= 0);
  TestValidator.predicate("limit >= 0", result.pagination.limit >= 0);
  TestValidator.predicate("records >= 0", result.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", result.pagination.pages >= 0);
  // Validate community data structure
  if (result.data.length > 0) {
    result.data.forEach((community) => {
      TestValidator.predicate(
        "community has name",
        community.name !== undefined,
      );
      TestValidator.predicate(
        "community has icon_url",
        community.icon_url !== undefined,
      );
      TestValidator.predicate(
        "community has subscriber_count",
        community.subscriber_count !== undefined,
      );
    });
  }
}
