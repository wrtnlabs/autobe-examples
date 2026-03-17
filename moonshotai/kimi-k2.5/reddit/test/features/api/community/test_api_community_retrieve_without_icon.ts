import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
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
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

export async function test_api_community_retrieve_without_icon(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member connection for community creation
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, { body: {} });
  // Create a community without icon (do not provide iconAttachmentId)
  const createdCommunity: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {
        body: { iconAttachmentId: undefined },
      },
    );
  // Retrieve the community (no authentication required, can use base connection)
  const retrievedCommunity: IRedditLikeCommunity =
    await api.functional.redditLike.communities.at(connection, {
      communityId: createdCommunity.id,
    });
  // Validate complete response structure
  typia.assert(retrievedCommunity);
  // Verify the icon is null
  TestValidator.equals("icon is null", retrievedCommunity.icon, null);
  // Verify other fields are correctly populated
  TestValidator.equals(
    "name matches created community",
    retrievedCommunity.name,
    createdCommunity.name,
  );
  TestValidator.equals(
    "description matches created community",
    retrievedCommunity.description,
    createdCommunity.description,
  );
  TestValidator.equals(
    "id matches created community",
    retrievedCommunity.id,
    createdCommunity.id,
  );
  TestValidator.equals(
    "owner id matches created community",
    retrievedCommunity.owner.id,
    createdCommunity.owner.id,
  );
}
