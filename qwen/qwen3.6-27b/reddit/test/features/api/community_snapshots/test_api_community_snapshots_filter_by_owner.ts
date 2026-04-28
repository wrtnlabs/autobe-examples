import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityCommunitySnapshot";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IRedditLikeCommunityCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";

export async function test_api_community_snapshots_filter_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new member to act as the community owner for snapshot tracking
  const memberConnection = { host: connection.host } as api.IConnection;
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a community as the authenticated member (member becomes the owner)
  const communityConnection = { host: connection.host } as api.IConnection;
  communityConnection.headers = memberConnection.headers;
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      communityConnection,
      { body: undefined },
    );
  typia.assert(community);
  // 3. Filter community snapshots by owner member ID
  const snapshotsConnection = { host: connection.host } as api.IConnection;
  const body: IRedditLikeCommunityCommunitySnapshot.IRequest = {
    owner_member_id: member.id,
  };
  const result =
    await api.functional.redditLikeCommunity.community_snapshots.index(
      snapshotsConnection,
      { body },
    );
  typia.assert(result);
  // 4. Validate the results
  TestValidator.equals(
    "snapshots data array exists",
    Array.isArray(result.data),
    true,
  );
  TestValidator.equals(
    "pagination metadata exists",
    result.pagination !== null && result.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination current page is 1",
    result.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    result.pagination.limit > 0,
  );
  TestValidator.equals(
    "pagination records count matches data length",
    result.pagination.records,
    result.data.length,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    result.pagination.pages >= 0,
  );
  // 5. Validate that all returned snapshots have the correct owner
  result.data.forEach((snapshot) => {
    TestValidator.equals(
      `snapshot ${snapshot.community_id} has correct owner_member_id`,
      snapshot.owner_id,
      member.id,
    );
  });
}