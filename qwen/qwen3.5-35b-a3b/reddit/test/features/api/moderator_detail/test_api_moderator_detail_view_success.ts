import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunityModeratorDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModeratorDetail";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_create } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";

export async function test_api_moderator_detail_view_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(16),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph(),
      avatar_url: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuth);
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: adminAuth.token.access,
  };
  // Step 2: Create member1 and authenticate
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member1Auth);
  member1Connection.headers = {
    ...member1Connection.headers,
    Authorization: member1Auth.token.access,
  };
  // Step 3: Member1 creates a community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      member1Connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          icon_url: null,
        },
      },
    );
  typia.assert(community);
  // Step 4: Create member2 and authenticate
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member2Auth);
  member2Connection.headers = {
    ...member2Connection.headers,
    Authorization: member2Auth.token.access,
  };
  // Step 5: Member1 adds member2 as moderator
  const moderatorResult =
    await api.functional.redditPlatform.member.communities.moderators.create(
      member1Connection,
      {
        communityId: community.id,
        body: {
          user_id: member2Auth.id,
        } satisfies IRedditPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorResult);
  // Step 6: Admin retrieves moderator detail
  const moderatorDetail =
    await api.functional.redditPlatform.admin.communities.moderators.at(
      adminConnection,
      {
        communityId: community.id,
        moderatorId: member2Auth.id,
      },
    );
  typia.assert(moderatorDetail);
  // Step 7: Validate response
  TestValidator.equals(
    "moderator id matches requested moderatorId",
    moderatorDetail.user.id,
    member2Auth.id,
  );
  TestValidator.equals(
    "moderator user username matches member2",
    moderatorDetail.user.username,
    member2Auth.user.username,
  );
  TestValidator.equals(
    "moderator user display_name matches member2",
    moderatorDetail.user.display_name,
    member2Auth.user.display_name,
  );
  TestValidator.equals(
    "moderator user karma_score matches member2",
    moderatorDetail.user.karma_score,
    member2Auth.user.karma_score,
  );
  TestValidator.equals(
    "moderator user is_active matches member2",
    moderatorDetail.user.is_active,
    member2Auth.user.is_active,
  );
  TestValidator.equals(
    "moderator community_id relationship matches",
    moderatorResult.community_id,
    community.id,
  );
  TestValidator.predicate(
    "moderator created_at is valid date-time",
    () =>
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(moderatorDetail.created_at),
  );
  TestValidator.predicate(
    "moderator updated_at is valid date-time",
    () =>
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(moderatorDetail.updated_at),
  );
}
