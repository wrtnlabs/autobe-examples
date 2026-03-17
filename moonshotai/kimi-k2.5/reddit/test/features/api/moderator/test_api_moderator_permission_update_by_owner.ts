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
import { generate_random_reddit_like_owner_moderators_create } from "../../../generate/generate_random_reddit_like_owner_moderators_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_moderator } from "../../../prepare/prepare_random_reddit_like_moderator";

export async function test_api_moderator_permission_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create owner account and authenticate
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = typia.random<string & tags.Format<"password">>();
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
      nickname: RandomGenerator.name(),
    } satisfies IRedditLikeOwner.IJoin,
  });
  typia.assert(owner);
  // Step 2: Authenticate owner with login
  await authorize_owner_login(ownerConnection, {
    body: {
      email: ownerEmail,
      password: (ownerPassword) satisfies string as string,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IRedditLikeOwner.ILogin,
  });
  // Step 3: Create member account (who will become moderator)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.name(1),
      password: memberPassword,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // Step 4: Owner creates a community
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        iconAttachmentId: null,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // Step 5: Owner adds member as moderator with canAddModerators = false
  const moderator = await generate_random_reddit_like_owner_moderators_create(
    ownerConnection,
    {
      body: {
        communityId: community.id,
        memberId: member.id,
        canAddModerators: false,
      } satisfies IRedditLikeModerator.ICreate,
    },
  );
  typia.assert(moderator);
  // Verify initial state: can_add_moderators is false
  TestValidator.equals(
    "moderator initial can_add_moderators is false",
    moderator.can_add_moderators,
    false,
  );
  TestValidator.predicate(
    "moderator has member relation populated",
    moderator.member !== null && moderator.member !== undefined,
  );
  TestValidator.predicate(
    "moderator has community relation populated",
    moderator.community !== null && moderator.community !== undefined,
  );
  // Store timestamps for comparison
  const initialCreatedAt = new Date(moderator.created_at).getTime();
  const initialUpdatedAt = new Date(moderator.updated_at).getTime();
  // Step 6: Owner updates moderator permissions
  const updatedModerator =
    await api.functional.redditLike.moderator.moderators.update(
      ownerConnection,
      {
        moderatorId: moderator.id,
        body: {
          role: "admin_moderator",
        } satisfies IRedditLikeModerator.IUpdate,
      },
    );
  typia.assert(updatedModerator);
  // Step 7: Validate update response
  // Verify moderator id matches
  TestValidator.equals(
    "moderator id unchanged after update",
    updatedModerator.id,
    moderator.id,
  );
  // Verify member relation is populated
  TestValidator.predicate(
    "member relation populated in update response",
    updatedModerator.member !== null &&
      updatedModerator.member !== undefined &&
      updatedModerator.member.id === member.id,
  );
  // Verify community relation is populated
  TestValidator.predicate(
    "community relation populated in update response",
    updatedModerator.community !== null &&
      updatedModerator.community !== undefined &&
      updatedModerator.community.id === community.id,
  );
  // Verify updated_at timestamp is different (refreshed)
  const newUpdatedAt = new Date(updatedModerator.updated_at).getTime();
  TestValidator.predicate(
    "updated_at timestamp is refreshed",
    newUpdatedAt > initialUpdatedAt,
  );
  // Verify created_at remains unchanged
  const newCreatedAt = new Date(updatedModerator.created_at).getTime();
  TestValidator.equals(
    "created_at timestamp unchanged",
    newCreatedAt,
    initialCreatedAt,
  );
  // Verify soft delete status is null (active)
  TestValidator.equals(
    "moderator is not soft deleted",
    updatedModerator.deleted_at,
    null,
  );
}