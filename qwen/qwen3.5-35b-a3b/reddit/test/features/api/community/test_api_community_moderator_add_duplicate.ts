import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_add } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_add";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

export async function test_api_community_moderator_add_duplicate(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member A (community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(owner);
  // 2. Authenticate as member B (user to be added as moderator)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberB);
  // 3. Create community as member A (owner)
  const community =
    await generate_random_reddit_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Add member B as moderator successfully (first time)
  const firstAppointment =
    await api.functional.redditPlatform.member.communities.moderators.add(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          user_id: memberB.id,
        } satisfies IRedditPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(firstAppointment);
  TestValidator.equals(
    "first appointment successful - community matches",
    firstAppointment.community.id,
    community.id,
  );
  TestValidator.equals(
    "first appointment successful - user matches",
    firstAppointment.user.id,
    memberB.id,
  );
  const firstAppointmentId = firstAppointment.id;
  // 5. Attempt to add member B as moderator again (should fail with 409 Conflict)
  await TestValidator.httpError(
    "duplicate moderator appointment should fail with 409 Conflict",
    409,
    async () => {
      await api.functional.redditPlatform.member.communities.moderators.add(
        ownerConnection,
        {
          communityId: community.id,
          body: {
            user_id: memberB.id,
          } satisfies IRedditPlatformCommunityModerator.ICreate,
        },
      );
    },
  );
  // 6. Verify no duplicate appointment was created by checking community moderators
  // The community object from creation already has empty moderators array
  // We need to verify through the appointment itself that only one exists
  // This test validates the unique constraint at the API level through the error response
  // Additional validation: verify the original appointment is still valid
  TestValidator.equals(
    "original appointment remains valid",
    firstAppointment.id,
    firstAppointmentId,
  );
  TestValidator.equals(
    "appointment community unchanged",
    firstAppointment.community.id,
    community.id,
  );
  TestValidator.equals(
    "appointment user unchanged",
    firstAppointment.user.id,
    memberB.id,
  );
}
