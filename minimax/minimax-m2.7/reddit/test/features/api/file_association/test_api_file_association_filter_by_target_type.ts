import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneFileAssociation";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
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
import { generate_random_reddit_clone_member_file_associations_create } from "../../../generate/generate_random_reddit_clone_member_file_associations_create";
import { generate_random_reddit_clone_member_files_create } from "../../../generate/generate_random_reddit_clone_member_files_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_file } from "../../../prepare/prepare_random_reddit_clone_file";
import { prepare_random_reddit_clone_file_association } from "../../../prepare/prepare_random_reddit_clone_file_association";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";

export async function test_api_file_association_filter_by_target_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Upload a file for community icon
  const communityIconFile =
    await generate_random_reddit_clone_member_files_create(memberConnection, {
      body: {
        target_id: community.id,
        target_type: "community",
      },
    });
  typia.assert(communityIconFile);
  // 4. Create file association with target_type='community'
  const communityAssociation =
    await generate_random_reddit_clone_member_file_associations_create(
      memberConnection,
      {
        body: {
          redditCloneFileId: communityIconFile.id,
          targetId: community.id,
          targetType: "community",
        },
      },
    );
  typia.assert(communityAssociation);
  // 5. Create a text post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityName: community.name,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
      },
    },
  );
  typia.assert(post);
  // 6. Upload a file for post image
  const postImageFile = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {
      body: {
        target_id: post.id,
        target_type: "post",
      },
    },
  );
  typia.assert(postImageFile);
  // 7. Create file association with target_type='post'
  const postAssociation =
    await generate_random_reddit_clone_member_file_associations_create(
      memberConnection,
      {
        body: {
          redditCloneFileId: postImageFile.id,
          targetId: post.id,
          targetType: "post",
        },
      },
    );
  typia.assert(postAssociation);
  // 8. Test filtering by target_type='community'
  const communityFiltered =
    await api.functional.redditClone.file_associations.index(memberConnection, {
      body: {
        targetType: "community",
      } satisfies IRedditCloneFileAssociation.IRequest,
    });
  typia.assert(communityFiltered);
  // 9. Test filtering by target_type='post'
  const postFiltered = await api.functional.redditClone.file_associations.index(
    memberConnection,
    {
      body: {
        targetType: "post",
      } satisfies IRedditCloneFileAssociation.IRequest,
    },
  );
  typia.assert(postFiltered);
  // 10. Validate filtered results
  TestValidator.predicate(
    "community filtered results should have at least 1 item",
    communityFiltered.data.length >= 1,
  );
  TestValidator.predicate(
    "post filtered results should have at least 1 item",
    postFiltered.data.length >= 1,
  );
  // All items in communityFiltered should have target_type='community'
  for (const item of communityFiltered.data) {
    TestValidator.equals(
      "target_type should be 'community'",
      item.target_type,
      "community",
    );
  }
  // All items in postFiltered should have target_type='post'
  for (const item of postFiltered.data) {
    TestValidator.equals(
      "target_type should be 'post'",
      item.target_type,
      "post",
    );
  }
  // 11. Test pagination with filter
  const paginatedCommunity =
    await api.functional.redditClone.file_associations.index(memberConnection, {
      body: {
        targetType: "community",
        page: 1,
        limit: 10,
      } satisfies IRedditCloneFileAssociation.IRequest,
    });
  typia.assert(paginatedCommunity);
  TestValidator.equals(
    "pagination page should be 1",
    paginatedCommunity.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    paginatedCommunity.pagination.limit,
    10,
  );
}
