import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformModeratorHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeratorHistory";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_moderator_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: ownerEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
    },
  });
  typia.assert(owner);
  // 2. Create community as owner
  const community =
    await generate_random_reddit_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Authenticate as member to be appointed (moderator)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
    },
  });
  typia.assert(moderator);
  // 4. Authenticate back as owner to retrieve history
  const historyConnection: api.IConnection = { host: connection.host };
  const historyAuth = await authorize_member_login(historyConnection, {
    body: {
      email: ownerEmail,
      password: "1234",
    },
  });
  typia.assert(historyAuth);
  // 5. Retrieve moderator history
  const historyId = typia.random<string & tags.Format<"uuid">>();
  const history =
    await api.functional.redditPlatform.member.communities.moderator_histories.at(
      historyConnection,
      {
        communityId: community.id,
        historyId: historyId,
      },
    );
  typia.assert(history);
  // 6. Validate response
  TestValidator.equals("action type", history.action_type, "APPOINTED");
  TestValidator.equals(
    "community id matches",
    history.community.id,
    community.id,
  );
  TestValidator.equals("user id matches", history.user.id, moderator.id);
  TestValidator.equals("acted by id", history.acted_by?.id, owner.id);
  TestValidator.equals(
    "community name",
    history.community.name,
    community.name,
  );
  TestValidator.predicate(
    "community has subscriber count",
    () => history.community.subscriber_count >= 0,
  );
  TestValidator.notEquals("has timestamps", history.created_at, null);
  TestValidator.notEquals("updated_at", history.updated_at, null);
  TestValidator.notEquals("deleted_at", history.deleted_at, null);
}