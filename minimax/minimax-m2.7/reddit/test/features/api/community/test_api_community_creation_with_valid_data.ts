import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";

export async function test_api_community_creation_with_valid_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member to obtain session token
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IRedditCloneMemberSession.IAuthorized =
    await authorize_member_join(memberConnection, {});
  // 2. Create a new community with valid name and description
  const communityName = RandomGenerator.alphabets(8);
  const communityDescription = RandomGenerator.paragraph({ sentences: 2 });
  const community: IRedditCloneCommunityBan =
    await api.functional.redditClone.member.communities.create(
      memberConnection,
      {
        body: {
          name: communityName,
          description: communityDescription,
        } satisfies IRedditCloneCommunityBan.ICreate,
      },
    );
  // 3. Validate response with typia.assert
  typia.assert(community);
  // 4. Validate business logic assertions
  TestValidator.equals(
    "community name matches input",
    community.name,
    communityName,
  );
  TestValidator.equals(
    "description matches input",
    community.description,
    communityDescription,
  );
  TestValidator.equals("subscriber count is 0", community.subscriber_count, 0);
  TestValidator.equals(
    "owner matches authenticated member",
    community.owner.username,
    authorized.username,
  );
  TestValidator.predicate("deleted_at is null", community.deleted_at === null);
  TestValidator.equals("posts count is 0", community.posts_count, 0);
  TestValidator.equals("comments count is 0", community.comments_count, 0);
  TestValidator.equals("moderators count is 1", community.moderators_count, 1);
  TestValidator.predicate(
    "created_at exists",
    community.created_at !== undefined && community.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at exists",
    community.updated_at !== undefined && community.updated_at !== null,
  );
}
