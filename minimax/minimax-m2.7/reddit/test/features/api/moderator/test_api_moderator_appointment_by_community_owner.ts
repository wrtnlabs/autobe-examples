import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneModeratorSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorSnapshot";
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
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_moderator_snapshot } from "../../../prepare/prepare_random_reddit_clone_moderator_snapshot";

export async function test_api_moderator_appointment_by_community_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins the platform
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: `owner_${RandomGenerator.alphabets(8)}`,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  typia.assert(memberA);
  // 2. Member A creates a community
  const community = await api.functional.redditClone.member.communities.create(
    memberAConnection,
    {
      body: {
        name: "tech-talk",
        description: "Technology discussion community",
      } satisfies IRedditCloneCommunityBan.ICreate,
    },
  );
  typia.assert(community);
  TestValidator.equals(
    "community name is tech-talk",
    community.name,
    "tech-talk",
  );
  TestValidator.equals(
    "community owner is memberA",
    community.owner.username,
    memberA.username,
  );
  // 3. Member B joins the platform
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: `moderator_${RandomGenerator.alphabets(8)}`,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  typia.assert(memberB);
  // 4. Member A appoints Member B as moderator
  const moderatorSnapshot =
    await api.functional.redditClone.member.communities.moderators.create(
      memberAConnection,
      {
        communityName: community.name,
        body: {
          memberUsername: memberB.username,
        } satisfies IRedditCloneModeratorSnapshot.ICreate,
      },
    );
  typia.assert(moderatorSnapshot);
  // 5. Validate the moderator appointment response
  TestValidator.equals(
    "role is moderator",
    moderatorSnapshot.role,
    "moderator",
  );
  TestValidator.equals(
    "member is memberB",
    moderatorSnapshot.member.username,
    memberB.username,
  );
  TestValidator.equals(
    "community is tech-talk",
    moderatorSnapshot.community.name,
    "tech-talk",
  );
  TestValidator.equals(
    "assigner is memberA",
    moderatorSnapshot.assigner.username,
    memberA.username,
  );
  TestValidator.predicate(
    "created_at exists",
    moderatorSnapshot.created_at !== null &&
      moderatorSnapshot.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    moderatorSnapshot.updated_at !== null &&
      moderatorSnapshot.updated_at !== undefined,
  );
  TestValidator.equals(
    "deleted_at is null",
    moderatorSnapshot.deleted_at,
    null,
  );
}
