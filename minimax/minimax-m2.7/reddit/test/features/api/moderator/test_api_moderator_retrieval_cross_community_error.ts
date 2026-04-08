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
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

export async function test_api_moderator_retrieval_cross_community_error(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member1
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {});
  // 2. Create community1 with member1
  const community1 =
    await generate_random_reddit_clone_member_communities_create(
      member1Connection,
      {},
    );
  typia.assert(community1);
  // 3. Authenticate as member2
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {});
  // 4. Create community2 with member2
  const community2 =
    await generate_random_reddit_clone_member_communities_create(
      member2Connection,
      {},
    );
  typia.assert(community2);
  // 5. Generate non-existent moderator UUID (no list endpoint available to get actual moderator IDs)
  const nonExistentModeratorId = typia.random<string & tags.Format<"uuid">>();
  // 6. Attempt to retrieve moderator from community1 with non-existent moderator ID
  // This should return 404 as the moderator does not belong to community1
  await TestValidator.httpError(
    "cross-community moderator retrieval should return 404",
    404,
    async () =>
      await api.functional.redditClone.member.communities.moderators.at(
        member1Connection,
        {
          communityId: community1.id,
          moderatorId: nonExistentModeratorId,
        },
      ),
  );
  // 7. Also test with community2's ID to verify cross-community isolation
  await TestValidator.httpError(
    "accessing moderator with wrong community ID should return 404",
    404,
    async () =>
      await api.functional.redditClone.member.communities.moderators.at(
        member2Connection,
        {
          communityId: community1.id,
          moderatorId: nonExistentModeratorId,
        },
      ),
  );
}
