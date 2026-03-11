import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
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
import { generate_random_reddit_platform_member_communities_moderators_create } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";

export async function test_api_community_moderator_removal_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner (member A)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
    } as IRedditPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  const { user: owner, token } = ownerAuth;
  // 2. Create a community as owner (member A)
  const ownerTokenConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: token.access },
  };
  const community =
    await api.functional.redditPlatform.member.communities.create(
      ownerTokenConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10)
            .toLowerCase()
            .replace(/[^a-z0-9]/g, ""),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Join as member B (first moderator)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
    } as IRedditPlatformMember.IJoin,
  });
  typia.assert(memberBAuth);
  const { user: memberB } = memberBAuth;
  // 4. Join as member D (second moderator)
  const memberDConnection: api.IConnection = { host: connection.host };
  const memberDAuth = await authorize_member_join(memberDConnection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
    } as IRedditPlatformMember.IJoin,
  });
  typia.assert(memberDAuth);
  const { user: memberD } = memberDAuth;
  // 5. Add member B as moderator (using owner's connection)
  const memberBModerator =
    await api.functional.redditPlatform.member.communities.moderators.create(
      ownerTokenConnection,
      {
        communityId: community.id,
        body: {
          user_id: memberB.id,
        } satisfies IRedditPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(memberBModerator);
  // 6. Add member D as moderator (using owner's connection)
  const memberDModerator =
    await api.functional.redditPlatform.member.communities.moderators.create(
      ownerTokenConnection,
      {
        communityId: community.id,
        body: {
          user_id: memberD.id,
        } satisfies IRedditPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(memberDModerator);
  // 7. Member D (moderator) attempts to remove member B as moderator (should fail with 403)
  await TestValidator.error(
    "non-owner moderator cannot remove other moderators",
    async () => {
      const memberDTokenConnection: api.IConnection = {
        host: connection.host,
        headers: { Authorization: memberDAuth.token.access },
      };
      await api.functional.redditPlatform.member.communities.moderators.eraseByCommunityidAndModeratorid(
        memberDTokenConnection,
        {
          communityId: community.id,
          moderatorId: memberB.id,
        },
      );
    },
  );
  // 8. Verify member B still exists as moderator (system check)
  // Owner should still be able to see member B as moderator
  const getModeratorConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: ownerAuth.token.access },
  };
  // Get community again to verify member B is still a moderator
  // We can verify by trying to delete member B as owner (which should succeed)
  // and ensuring member B was a valid moderator before
  // 9. Owner (member A) should be able to remove member B (verify system works)
  // This should succeed since owner has exclusive privileges
  await api.functional.redditPlatform.member.communities.moderators.eraseByCommunityidAndModeratorid(
    ownerTokenConnection,
    {
      communityId: community.id,
      moderatorId: memberB.id,
    },
  );
  // 10. Owner should NOT be able to remove non-existent moderator (404)
  await TestValidator.httpError(
    "owner cannot remove non-existent moderator",
    [404],
    async () => {
      await api.functional.redditPlatform.member.communities.moderators.eraseByCommunityidAndModeratorid(
        ownerTokenConnection,
        {
          communityId: community.id,
          moderatorId: memberB.id,
        },
      );
    },
  );
}