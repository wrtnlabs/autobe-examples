import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_moderator_moderators_create } from "../../../generate/generate_random_reddit_like_moderator_moderators_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_moderator } from "../../../prepare/prepare_random_reddit_like_moderator";

/**
 * Test successful retrieval of an existing moderator record. First authenticates as a moderator user, creates a community, and adds another member as a moderator to that community. Then calls GET /redditLike/moderators/{moderatorId} with the created moderator's ID. Verifies the response contains: moderator ID, can_add_moderators flag, nested member details (id, email, username, emailVerified, createdAt), nested community details (id, name, description, owner, icon, subscriberCount, createdAt), timestamps (created_at, updated_at), and confirms deleted_at is null. Validates that the retrieved moderator has proper governance privileges for the community.
 *
 * @param connection - The connection to the test server
 */
export async function test_api_moderator_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner user with moderator capabilities who will create the community
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_moderator_join(ownerConnection, {});
  // 2. Create target member who will be added as a moderator to the community
  const targetConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_moderator_join(targetConnection, {});
  // 3. Owner creates a new community
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 4. Owner adds the target member as a moderator to the community
  const createdModerator =
    await generate_random_reddit_like_moderator_moderators_create(
      ownerConnection,
      {
        body: {
          communityId: community.id,
          memberId: targetMember.member.id,
          canAddModerators: true,
        },
      },
    );
  typia.assert(createdModerator);
  // 5. Retrieve the created moderator record via GET endpoint
  const retrievedModerator = await api.functional.redditLike.moderators.at(
    connection,
    { moderatorId: createdModerator.id },
  );
  typia.assert(retrievedModerator);
  // 6. Validate the retrieved moderator matches the created one
  TestValidator.equals(
    "moderator ID matches",
    retrievedModerator.id,
    createdModerator.id,
  );
  TestValidator.equals(
    "can_add_moderators flag",
    retrievedModerator.can_add_moderators,
    true,
  );
  TestValidator.equals(
    "deleted_at is null",
    retrievedModerator.deleted_at,
    null,
  );
  TestValidator.equals(
    "member ID matches",
    retrievedModerator.member.id,
    targetMember.member.id,
  );
  TestValidator.equals(
    "community ID matches",
    retrievedModerator.community.id,
    community.id,
  );
}
