import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformBanAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanAssignment";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformBanAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBanAssignment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_bans_create } from "../../../generate/generate_random_community_platform_member_bans_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_ban_assignment_access_denied_for_non_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator connection and register moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await api.functional.communityPlatform.auth.member.join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        username: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    },
  );
  typia.assert(moderator);
  // 2. Create community with moderator as owner
  const community =
    await api.functional.communityPlatform.member.communities.create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create second member (to be banned) connection and register
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMember = await api.functional.communityPlatform.auth.member.join(
    bannedMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        username: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    },
  );
  typia.assert(bannedMember);
  // 4. Moderator creates ban on second member
  const ban = await api.functional.communityPlatform.member.bans.create(
    moderatorConnection,
    {
      communityId: community.id,
      body: {
        memberId: bannedMember.id,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ICommunityPlatformBan.ICreate,
    },
  );
  typia.assert(ban);
  // 5. Moderator lists ban assignments to get assignmentId
  const pageNumber = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >() satisfies number as number;
  const pageLimit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >() satisfies number as number;
  const assignmentsPage =
    await api.functional.communityPlatform.member.bans.assignments.index(
      moderatorConnection,
      {
        communityId: community.id,
        banId: ban.id,
        body: {
          page: pageNumber,
          limit: pageLimit,
        } satisfies ICommunityPlatformBanAssignment.IRequest,
      },
    );
  typia.assert(assignmentsPage);
  TestValidator.predicate(
    "at least one assignment exists",
    assignmentsPage.data.length > 0,
  );
  const assignmentId = assignmentsPage.data[0]!.id;
  // 6. Create third member (non-moderator) connection and register
  const regularMemberConnection: api.IConnection = { host: connection.host };
  const regularMember = await api.functional.communityPlatform.auth.member.join(
    regularMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        username: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    },
  );
  typia.assert(regularMember);
  // 7. Non-moderator attempts to access ban assignment - should get 403 Forbidden
  await TestValidator.httpError(
    "non-moderator cannot access ban assignment",
    403,
    async () => {
      await api.functional.communityPlatform.member.bans.assignments.at(
        regularMemberConnection,
        {
          communityId: community.id,
          banId: ban.id,
          assignmentId,
        },
      );
    },
  );
  // 8. Verify moderator can still access the assignment (positive control)
  const assignment =
    await api.functional.communityPlatform.member.bans.assignments.at(
      moderatorConnection,
      {
        communityId: community.id,
        banId: ban.id,
        assignmentId,
      },
    );
  typia.assert(assignment);
  TestValidator.equals("assignment ID matches", assignment.id, assignmentId);
}
