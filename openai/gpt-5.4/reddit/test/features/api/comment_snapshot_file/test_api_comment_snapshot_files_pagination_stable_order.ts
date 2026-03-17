import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentFile";
import type { ICommunityPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSnapshot";
import type { ICommunityPlatformCommentSnapshotFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSnapshotFile";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentSnapshotFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentSnapshotFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";

export async function test_api_comment_snapshot_files_pagination_stable_order(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const stableRequest = {
    page: 1,
    limit: 10,
    sort: "created_at",
  } satisfies ICommunityPlatformCommentSnapshotFile.IRequest;
  const firstPage =
    await api.functional.communityPlatform.member.posts.comments.snapshots.files.index(
      memberConnection,
      {
        postId,
        commentId,
        snapshotId,
        body: stableRequest,
      },
    );
  typia.assert(firstPage);
  const repeatedFirstPage =
    await api.functional.communityPlatform.member.posts.comments.snapshots.files.index(
      memberConnection,
      {
        postId,
        commentId,
        snapshotId,
        body: stableRequest,
      },
    );
  typia.assert(repeatedFirstPage);
  TestValidator.equals(
    "same request returns identical pagination metadata",
    repeatedFirstPage.pagination,
    firstPage.pagination,
  );
  TestValidator.equals(
    "same request returns identical ordered snapshot file ids",
    repeatedFirstPage.data.map((file) => file.id),
    firstPage.data.map((file) => file.id),
  );
  TestValidator.equals(
    "same request returns identical ordered comment file ids",
    repeatedFirstPage.data.map((file) => file.commentFile.id),
    firstPage.data.map((file) => file.commentFile.id),
  );
  TestValidator.equals(
    "current page matches requested page",
    firstPage.pagination.current,
    stableRequest.page,
  );
  TestValidator.equals(
    "limit matches requested limit",
    firstPage.pagination.limit,
    stableRequest.limit,
  );
  TestValidator.equals(
    "total pages derived from record count",
    firstPage.pagination.pages,
    firstPage.pagination.records === 0
      ? 0
      : Math.ceil(firstPage.pagination.records / firstPage.pagination.limit),
  );
  TestValidator.predicate(
    "page data length does not exceed limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  const boundaryFirstRequest = {
    page: 1,
    limit: 1,
    sort: "created_at",
  } satisfies ICommunityPlatformCommentSnapshotFile.IRequest;
  const boundarySecondRequest = {
    page: 2,
    limit: 1,
    sort: "created_at",
  } satisfies ICommunityPlatformCommentSnapshotFile.IRequest;
  const boundaryFirstPage =
    await api.functional.communityPlatform.member.posts.comments.snapshots.files.index(
      memberConnection,
      {
        postId,
        commentId,
        snapshotId,
        body: boundaryFirstRequest,
      },
    );
  typia.assert(boundaryFirstPage);
  const boundarySecondPage =
    await api.functional.communityPlatform.member.posts.comments.snapshots.files.index(
      memberConnection,
      {
        postId,
        commentId,
        snapshotId,
        body: boundarySecondRequest,
      },
    );
  typia.assert(boundarySecondPage);
  TestValidator.equals(
    "boundary first page current matches request",
    boundaryFirstPage.pagination.current,
    boundaryFirstRequest.page,
  );
  TestValidator.equals(
    "boundary second page current matches request",
    boundarySecondPage.pagination.current,
    boundarySecondRequest.page,
  );
  TestValidator.equals(
    "boundary first page limit matches request",
    boundaryFirstPage.pagination.limit,
    boundaryFirstRequest.limit,
  );
  TestValidator.equals(
    "boundary second page limit matches request",
    boundarySecondPage.pagination.limit,
    boundarySecondRequest.limit,
  );
  TestValidator.equals(
    "record count is consistent across boundary pages",
    boundarySecondPage.pagination.records,
    boundaryFirstPage.pagination.records,
  );
  TestValidator.equals(
    "page count is consistent across boundary pages",
    boundarySecondPage.pagination.pages,
    boundaryFirstPage.pagination.pages,
  );
  TestValidator.equals(
    "boundary page count derived from records",
    boundaryFirstPage.pagination.pages,
    boundaryFirstPage.pagination.records === 0
      ? 0
      : Math.ceil(
          boundaryFirstPage.pagination.records /
            boundaryFirstPage.pagination.limit,
        ),
  );
  if (boundaryFirstPage.pagination.records > 1) {
    const combinedIds = [
      ...boundaryFirstPage.data.map((file) => file.id),
      ...boundarySecondPage.data.map((file) => file.id),
    ];
    TestValidator.equals(
      "adjacent pages do not duplicate snapshot file associations",
      new Set(combinedIds).size,
      combinedIds.length,
    );
  } else {
    TestValidator.equals(
      "second boundary page is empty when there are fewer than two records",
      boundarySecondPage.data.length,
      0,
    );
  }
}
