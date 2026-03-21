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

export async function test_api_thumbnail_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member by joining the platform
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community to use as target entity
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Upload a valid image file (JPEG, PNG, GIF, or WebP) with target_type='community'
  const file = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {
      body: {
        target_type: "community",
        target_id: community.id,
      },
    },
  );
  typia.assert(file);
  // 4. Retrieve thumbnails using the patch endpoint with empty body to get all variants
  const thumbnailPage = await api.functional.redditClone.files.thumbnails.index(
    memberConnection,
    {
      fileId: file.id,
      body: {},
    },
  );
  typia.assert(thumbnailPage);
  // Validate response returns paginated list of thumbnails
  TestValidator.equals(
    "pagination metadata present",
    thumbnailPage.pagination !== null && thumbnailPage.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "data array present",
    Array.isArray(thumbnailPage.data),
    true,
  );
  // Validate pagination metadata contains required fields
  const pagination = thumbnailPage.pagination;
  TestValidator.predicate(
    "pagination has current page",
    pagination.current >= 0,
  );
  TestValidator.predicate("pagination has limit", pagination.limit > 0);
  TestValidator.predicate(
    "pagination has records count",
    pagination.records >= 0,
  );
  TestValidator.predicate("pagination has total pages", pagination.pages >= 0);
  // Validate thumbnails exist
  TestValidator.predicate(
    "has at least one thumbnail",
    thumbnailPage.data.length > 0,
  );
  // Validate each thumbnail contains required fields
  for (const thumbnail of thumbnailPage.data) {
    TestValidator.equals(
      "thumbnail has valid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        thumbnail.id,
      ),
      true,
    );
    TestValidator.equals(
      "thumbnail has variant",
      typeof thumbnail.variant === "string" && thumbnail.variant.length > 0,
      true,
    );
    TestValidator.predicate("width is positive", thumbnail.width > 0);
    TestValidator.predicate("height is positive", thumbnail.height > 0);
    TestValidator.equals(
      "thumbnail has path",
      typeof thumbnail.thumbnailPath === "string" &&
        thumbnail.thumbnailPath.length > 0,
      true,
    );
    TestValidator.equals(
      "created_at is not null",
      thumbnail.createdAt !== null && thumbnail.createdAt !== undefined,
      true,
    );
  }
  // Validate thumbnails include small, medium, and large variants
  const variants = thumbnailPage.data.map((t) => t.variant);
  TestValidator.predicate("has small variant", variants.includes("small"));
  TestValidator.predicate("has medium variant", variants.includes("medium"));
  TestValidator.predicate("has large variant", variants.includes("large"));
}
