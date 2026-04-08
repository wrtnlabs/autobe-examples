import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityModerator";
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

export async function test_api_moderator_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner joins and creates a community
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 2. Create 5 additional members (they become moderators automatically)
  const MODERATOR_COUNT = 5;
  const moderatorConnections: api.IConnection[] = [];
  for (let i = 0; i < MODERATOR_COUNT; i++) {
    const modConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(modConnection, {});
    moderatorConnections.push(modConnection);
  }
  // 3. List moderators with page=1, limit=2
  const page1 =
    await api.functional.redditClone.member.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IRedditCloneCommunityModerator.IRequest,
      },
    );
  typia.assert(page1);
  // 4. Validate first page pagination metadata
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 2);
  TestValidator.predicate(
    "records >= 6 (owner + 5 moderators)",
    page1.pagination.records >= 6,
  );
  TestValidator.predicate(
    "total pages >= 3 (ceiling of 6/2)",
    page1.pagination.pages >= 3,
  );
  // 5. List moderators with page=2, limit=2
  const page2 =
    await api.functional.redditClone.member.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          page: 2,
          limit: 2,
        } satisfies IRedditCloneCommunityModerator.IRequest,
      },
    );
  typia.assert(page2);
  // 6. Validate second page pagination metadata
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 2);
  TestValidator.equals(
    "records matches page 1",
    page2.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "total pages matches page 1",
    page2.pagination.pages,
    page1.pagination.pages,
  );
  // 7. Validate pages calculation is correct
  const expectedPages = Math.ceil(page1.pagination.records / 2);
  TestValidator.equals(
    "pages calculated correctly",
    page1.pagination.pages,
    expectedPages,
  );
  // 8. Validate no overlap between pages
  const page1Ids = page1.data.map((m) => m.id);
  const page2Ids = page2.data.map((m) => m.id);
  const overlap = page1Ids.filter((id) => page2Ids.includes(id));
  TestValidator.equals("no overlap between pages", overlap.length, 0);
  // 9. Validate empty page when requesting beyond total pages
  const beyondTotalPage =
    await api.functional.redditClone.member.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          page: page1.pagination.pages + 1,
          limit: 2,
        } satisfies IRedditCloneCommunityModerator.IRequest,
      },
    );
  typia.assert(beyondTotalPage);
  TestValidator.equals(
    "page beyond total has current updated",
    beyondTotalPage.pagination.current,
    page1.pagination.pages + 1,
  );
  TestValidator.equals(
    "data array is empty beyond total pages",
    beyondTotalPage.data.length,
    0,
  );
}
