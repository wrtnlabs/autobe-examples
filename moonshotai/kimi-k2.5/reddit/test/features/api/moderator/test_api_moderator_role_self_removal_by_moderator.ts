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
import { generate_random_reddit_like_member_attachments_create } from "../../../generate/generate_random_reddit_like_member_attachments_create";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_owner_moderators_create } from "../../../generate/generate_random_reddit_like_owner_moderators_create";
import { prepare_random_reddit_like_attachment } from "../../../prepare/prepare_random_reddit_like_attachment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_moderator } from "../../../prepare/prepare_random_reddit_like_moderator";

export async function test_api_moderator_role_self_removal_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // === SETUP: Create Member A (Community Owner) ===
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAPassword: string = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: memberAPassword,
    } satisfies IRedditLikeMember.IJoin,
  });
  // === SETUP: Create Community as Member A ===
  const community = await generate_random_reddit_like_member_communities_create(
    memberAConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  // === SETUP: Create Member B (will become moderator) ===
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBPassword: string = RandomGenerator.alphaNumeric(16);
  const memberBEmail: string = typia.random<string & tags.Format<"email">>();
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: memberBEmail,
      username: RandomGenerator.name(1),
      password: memberBPassword,
    } satisfies IRedditLikeMember.IJoin,
  });
  // === SETUP: Add Member B as Moderator (using Owner's connection) ===
  const moderator = await generate_random_reddit_like_owner_moderators_create(
    memberAConnection,
    {
      body: {
        communityId: community.id,
        memberId: memberB.id,
        canAddModerators: false,
      } satisfies IRedditLikeModerator.ICreate,
    },
  );
  // === EXECUTION: Authenticate as Moderator (Member B) ===
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_login(moderatorConnection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
    } satisfies IRedditLikeModerator.ILogin,
  });
  // === EXECUTION: Self-remove Moderator Role ===
  // This should succeed without owner intervention
  await api.functional.redditLike.moderator.moderators.erase(
    moderatorConnection,
    {
      moderatorId: moderator.id,
    },
  );
  // If we reach here, self-removal was successful
  // The operation confirms that moderators can remove themselves
}
