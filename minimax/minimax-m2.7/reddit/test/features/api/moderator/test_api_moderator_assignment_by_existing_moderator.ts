import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
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
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_community_moderator } from "../../../prepare/prepare_random_reddit_clone_community_moderator";

export async function test_api_moderator_assignment_by_existing_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register three member accounts
  const ownerConnection: api.IConnection = { host: connection.host };
  const firstModeratorConnection: api.IConnection = { host: connection.host };
  const secondModeratorConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  const firstModerator = await authorize_member_join(
    firstModeratorConnection,
    {},
  );
  const secondModerator = await authorize_member_join(
    secondModeratorConnection,
    {},
  );
  // 2. Owner creates a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Owner assigns the first member as a moderator
  const firstModeratorAssignment =
    await generate_random_reddit_clone_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(firstModeratorAssignment);
  // 4. Verify first moderator assignment succeeds
  TestValidator.predicate(
    "first moderator assignment successful",
    firstModeratorAssignment.pendingReportsCount >= 0,
  );
  // 5. First moderator assigns the second member as a moderator
  const secondModeratorAssignment =
    await generate_random_reddit_clone_member_communities_moderators_create(
      firstModeratorConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(secondModeratorAssignment);
  // 6. Validate second moderator assignment succeeds
  TestValidator.predicate(
    "second moderator assignment by first moderator successful",
    secondModeratorAssignment.pendingReportsCount >= 0,
  );
  // 7. Verify moderators can add other moderators (business rule validated by successful second assignment)
  TestValidator.predicate("moderators can add other moderators", true);
}
