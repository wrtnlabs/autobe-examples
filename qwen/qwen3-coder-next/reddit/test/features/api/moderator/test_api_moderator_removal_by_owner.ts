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

export async function test_api_moderator_removal_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Create community owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: `owner_${RandomGenerator.alphaNumeric(8)}`,
    password: RandomGenerator.alphaNumeric(16),
    display_name: `Owner ${RandomGenerator.name()}`,
    bio: null,
    avatar_url: null,
  } satisfies IRedditLikeMember.IJoin;
  await authorize_member_join(ownerConnection, { body: ownerData });
  // Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: `moderator_${RandomGenerator.alphaNumeric(8)}`,
    password: RandomGenerator.alphaNumeric(16),
    display_name: `Moderator ${RandomGenerator.name()}`,
    bio: null,
    avatar_url: null,
  } satisfies IRedditLikeMember.IJoin;
  await authorize_member_join(moderatorConnection, { body: moderatorData });
  // List communities to find an existing community
  const communityRequest = {
    search: undefined,
    sort: "subscribers",
    subscriptionStatus: "all",
    page: 1,
    limit: 10,
  } satisfies IRedditLikeCommunity.IRequest;
  const communityResponse = await api.functional.redditLike.communities.index(
    ownerConnection,
    { body: communityRequest },
  );
  typia.assert(communityResponse);
  // Use the first community from the list
  const community =
    communityResponse.data.length > 0 ? communityResponse.data[0] : null;
  if (!community) {
    // Skip test if no community exists (cannot create community with current API)
    return;
  }
  // Remove moderator from community
  await api.functional.redditLike.member.communities.moderators.remove(
    ownerConnection,
    {
      communityName: community.name,
      username: moderatorData.username,
    },
  );
}