import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
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
import { generate_random_reddit_like_member_attachments_create } from "../../../generate/generate_random_reddit_like_member_attachments_create";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_moderator_moderators_create } from "../../../generate/generate_random_reddit_like_moderator_moderators_create";
import { prepare_random_reddit_like_attachment } from "../../../prepare/prepare_random_reddit_like_attachment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_moderator } from "../../../prepare/prepare_random_reddit_like_moderator";

export async function test_api_moderator_role_owner_removes_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member A (will be the owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA: IRedditLikeMember.IAuthorized = await authorize_member_join(
    memberAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(1),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(memberA);
  // 2. Create community as member A (member A becomes owner)
  const community: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create member B (will become moderator)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB: IRedditLikeMember.IAuthorized = await authorize_member_join(
    memberBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(1),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(memberB);
  // 4. Add member B as moderator to the community (as owner/member A)
  const moderator: IRedditLikeModerator =
    await generate_random_reddit_like_moderator_moderators_create(
      memberAConnection,
      {
        body: {
          communityId: community.id,
          memberId: memberB.id,
          canAddModerators: false,
        } satisfies IRedditLikeModerator.ICreate,
      },
    );
  typia.assert(moderator);
  // 5. Owner (member A) removes the moderator
  await api.functional.redditLike.moderator.moderators.erase(
    memberAConnection,
    {
      moderatorId: moderator.id,
    },
  );
}
