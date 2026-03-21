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

export async function test_api_moderator_role_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner joins the platform
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(owner);
  // 2. Owner creates a community (becomes automatic owner)
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Moderator joins the platform
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderator);
  // 4. Owner appoints the second member as moderator
  const moderatorSnapshot =
    await generate_random_reddit_clone_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { memberUsername: moderator.username },
      },
    );
  typia.assert(moderatorSnapshot);
  // 5. Owner updates the moderator's role (from 'moderator' to 'moderator')
  const updatedModerator =
    await api.functional.redditClone.member.communities.moderators.update(
      ownerConnection,
      {
        communityName: community.name,
        moderatorId: moderatorSnapshot.id,
        body: {
          role: "moderator",
        } satisfies IRedditCloneModeratorSnapshot.IUpdate,
      },
    );
  typia.assert(updatedModerator);
  // 6. Validate the response
  TestValidator.equals(
    "moderator id matches",
    updatedModerator.id,
    moderatorSnapshot.id,
  );
  TestValidator.equals(
    "role is 'moderator'",
    updatedModerator.role,
    "moderator",
  );
  TestValidator.equals(
    "member matches",
    updatedModerator.member.id,
    moderator.id,
  );
  TestValidator.equals(
    "community matches",
    updatedModerator.community.id,
    community.id,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    updatedModerator.updated_at !== null,
  );
}
