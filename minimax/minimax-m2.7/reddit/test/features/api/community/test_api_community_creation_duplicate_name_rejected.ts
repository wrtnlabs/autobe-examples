import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
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

export async function test_api_community_creation_duplicate_name_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member and connection
  const firstMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(firstMemberConnection, {});
  // 2. Create second member and connection
  const secondMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(secondMemberConnection, {});
  // 3. First member creates a community with a specific name
  const communityName = "test_community_name";
  const community = await api.functional.redditClone.member.communities.create(
    firstMemberConnection,
    {
      body: {
        name: communityName,
        description: "A test community for duplicate name testing",
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 4. Second member attempts to create a community with the SAME name
  // Expected: HTTP 409 Conflict or 400 Bad Request
  await TestValidator.httpError(
    "duplicate community name rejected",
    [400, 409],
    async () => {
      await api.functional.redditClone.member.communities.create(
        secondMemberConnection,
        {
          body: {
            name: communityName,
            description: "Another community with the same name",
          } satisfies IRedditCloneCommunity.ICreate,
        },
      );
    },
  );
}
