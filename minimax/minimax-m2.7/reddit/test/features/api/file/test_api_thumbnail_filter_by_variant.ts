import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneFileThumbnail";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
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
import { generate_random_reddit_clone_member_files_create } from "../../../generate/generate_random_reddit_clone_member_files_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_file } from "../../../prepare/prepare_random_reddit_clone_file";

export async function test_api_thumbnail_filter_by_variant(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Upload an image file to the community
  const file = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {
      body: {
        target_id: community.id,
        target_type: "community",
      },
    },
  );
  typia.assert(file);
  // 4. Wait for processing completion (thumbnails are generated asynchronously)
  await new Promise((resolve) => setTimeout(resolve, 5000));
  // 5. Retrieve all thumbnails first to verify we have multiple variants
  const allThumbnails = await api.functional.redditClone.files.thumbnails.index(
    memberConnection,
    {
      fileId: file.id,
      body: {},
    },
  );
  typia.assert(allThumbnails);
  // 6. Retrieve thumbnails filtered by variant='small' only
  const smallThumbnails =
    await api.functional.redditClone.files.thumbnails.index(memberConnection, {
      fileId: file.id,
      body: {
        variant: "small",
      } satisfies IRedditCloneFileThumbnail.IRequest,
    });
  typia.assert(smallThumbnails);
  // 7. Validate all returned thumbnails have variant field equal to 'small'
  for (const thumbnail of smallThumbnails.data) {
    TestValidator.equals(
      "thumbnail variant is small",
      thumbnail.variant,
      "small",
    );
  }
  // 8. Verify pagination works correctly with filtered results
  TestValidator.equals(
    "filtered results have pagination info",
    smallThumbnails.pagination !== null,
    true,
  );
  // 9. Filter by different variant types (medium, large) to ensure filtering works
  const mediumThumbnails =
    await api.functional.redditClone.files.thumbnails.index(memberConnection, {
      fileId: file.id,
      body: {
        variant: "medium",
      } satisfies IRedditCloneFileThumbnail.IRequest,
    });
  typia.assert(mediumThumbnails);
  const largeThumbnails =
    await api.functional.redditClone.files.thumbnails.index(memberConnection, {
      fileId: file.id,
      body: {
        variant: "large",
      } satisfies IRedditCloneFileThumbnail.IRequest,
    });
  typia.assert(largeThumbnails);
  // Validate medium variant results
  for (const thumbnail of mediumThumbnails.data) {
    TestValidator.equals(
      "thumbnail variant is medium",
      thumbnail.variant,
      "medium",
    );
  }
  // Validate large variant results
  for (const thumbnail of largeThumbnails.data) {
    TestValidator.equals(
      "thumbnail variant is large",
      thumbnail.variant,
      "large",
    );
  }
}
