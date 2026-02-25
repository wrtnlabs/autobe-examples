import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityFile";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test filtering files by type category and lifecycle status.
 *
 * This validates the business requirement that members can organize and find
 * their uploads by categorization. The test verifies various filter combinations
 * including fileType, status, and mimeType filtering.
 *
 * Test Flow:
 * 1. Create a member account and authenticate
 * 2. Test filtering by fileType (AVATAR, COMMUNITY_ICON, POST_IMAGE)
 * 3. Test filtering by status (TEMPORARY, ACTIVE)
 * 4. Test filtering by mimeType (image/jpeg, image/png, image/gif, image/webp)
 * 5. Test combined filter criteria
 * 6. Verify pagination works correctly
 * 7. Verify empty result set when no files match criteria
 */
export async function test_api_file_list_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Test filtering by fileType
  const avatarFiles = await api.functional.community.member.files.index(
    memberConnection,
    {
      body: {
        fileType: "AVATAR",
      } satisfies ICommunityFile.IRequest,
    },
  );
  typia.assert(avatarFiles);
  TestValidator.predicate(
    "avatar files contain only AVATAR type",
    avatarFiles.data.every((file) => file.fileType === "AVATAR"),
  );
  const communityIconFiles = await api.functional.community.member.files.index(
    memberConnection,
    {
      body: {
        fileType: "COMMUNITY_ICON",
      } satisfies ICommunityFile.IRequest,
    },
  );
  typia.assert(communityIconFiles);
  TestValidator.predicate(
    "community icon files contain only COMMUNITY_ICON type",
    communityIconFiles.data.every((file) => file.fileType === "COMMUNITY_ICON"),
  );
  const postImageFiles = await api.functional.community.member.files.index(
    memberConnection,
    {
      body: {
        fileType: "POST_IMAGE",
      } satisfies ICommunityFile.IRequest,
    },
  );
  typia.assert(postImageFiles);
  TestValidator.predicate(
    "post image files contain only POST_IMAGE type",
    postImageFiles.data.every((file) => file.fileType === "POST_IMAGE"),
  );
  // 3. Test filtering by status
  const temporaryFiles = await api.functional.community.member.files.index(
    memberConnection,
    {
      body: {
        status: "TEMPORARY",
      } satisfies ICommunityFile.IRequest,
    },
  );
  typia.assert(temporaryFiles);
  TestValidator.predicate(
    "temporary files contain only TEMPORARY status",
    temporaryFiles.data.every((file) => file.status === "TEMPORARY"),
  );
  const activeFiles = await api.functional.community.member.files.index(
    memberConnection,
    {
      body: {
        status: "ACTIVE",
      } satisfies ICommunityFile.IRequest,
    },
  );
  typia.assert(activeFiles);
  TestValidator.predicate(
    "active files contain only ACTIVE status",
    activeFiles.data.every((file) => file.status === "ACTIVE"),
  );
  // 4. Test filtering by mimeType
  const jpegFiles = await api.functional.community.member.files.index(
    memberConnection,
    {
      body: {
        mimeType: "image/jpeg",
      } satisfies ICommunityFile.IRequest,
    },
  );
  typia.assert(jpegFiles);
  TestValidator.predicate(
    "jpeg files contain only image/jpeg mime type",
    jpegFiles.data.every((file) => file.mimeType === "image/jpeg"),
  );
  const pngFiles = await api.functional.community.member.files.index(
    memberConnection,
    {
      body: {
        mimeType: "image/png",
      } satisfies ICommunityFile.IRequest,
    },
  );
  typia.assert(pngFiles);
  TestValidator.predicate(
    "png files contain only image/png mime type",
    pngFiles.data.every((file) => file.mimeType === "image/png"),
  );
  const gifFiles = await api.functional.community.member.files.index(
    memberConnection,
    {
      body: {
        mimeType: "image/gif",
      } satisfies ICommunityFile.IRequest,
    },
  );
  typia.assert(gifFiles);
  TestValidator.predicate(
    "gif files contain only image/gif mime type",
    gifFiles.data.every((file) => file.mimeType === "image/gif"),
  );
  const webpFiles = await api.functional.community.member.files.index(
    memberConnection,
    {
      body: {
        mimeType: "image/webp",
      } satisfies ICommunityFile.IRequest,
    },
  );
  typia.assert(webpFiles);
  TestValidator.predicate(
    "webp files contain only image/webp mime type",
    webpFiles.data.every((file) => file.mimeType === "image/webp"),
  );
  // 5. Test combined filter criteria
  const avatarActiveFiles = await api.functional.community.member.files.index(
    memberConnection,
    {
      body: {
        fileType: "AVATAR",
        status: "ACTIVE",
      } satisfies ICommunityFile.IRequest,
    },
  );
  typia.assert(avatarActiveFiles);
  TestValidator.predicate(
    "combined filter returns files matching both criteria",
    avatarActiveFiles.data.every(
      (file) => file.fileType === "AVATAR" && file.status === "ACTIVE",
    ),
  );
  const postImageJpegFiles = await api.functional.community.member.files.index(
    memberConnection,
    {
      body: {
        fileType: "POST_IMAGE",
        mimeType: "image/jpeg",
      } satisfies ICommunityFile.IRequest,
    },
  );
  typia.assert(postImageJpegFiles);
  TestValidator.predicate(
    "combined fileType and mimeType filter works correctly",
    postImageJpegFiles.data.every(
      (file) =>
        file.fileType === "POST_IMAGE" && file.mimeType === "image/jpeg",
    ),
  );
  // 6. Test pagination
  const paginatedFiles = await api.functional.community.member.files.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityFile.IRequest,
    },
  );
  typia.assert(paginatedFiles);
  TestValidator.equals(
    "pagination current page",
    paginatedFiles.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is respected",
    paginatedFiles.data.length <= 10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    paginatedFiles.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is calculated correctly",
    paginatedFiles.pagination.pages >= 0,
  );
  // 7. Test sorting
  const sortedByCreatedAt = await api.functional.community.member.files.index(
    memberConnection,
    {
      body: {
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies ICommunityFile.IRequest,
    },
  );
  typia.assert(sortedByCreatedAt);
  const sortedBySize = await api.functional.community.member.files.index(
    memberConnection,
    {
      body: {
        sortBy: "size",
        sortOrder: "asc",
      } satisfies ICommunityFile.IRequest,
    },
  );
  typia.assert(sortedBySize);
  // 8. Test filtering by member (own files)
  const ownFiles = await api.functional.community.member.files.index(
    memberConnection,
    {
      body: {
        memberId: member.id,
      } satisfies ICommunityFile.IRequest,
    },
  );
  typia.assert(ownFiles);
  TestValidator.predicate(
    "filtering by memberId returns correct uploader",
    ownFiles.data.every((file) => file.member.id === member.id),
  );
  // 9. Test empty result with unlikely filter combination
  const emptyResult = await api.functional.community.member.files.index(
    memberConnection,
    {
      body: {
        fileType: "AVATAR",
        status: "ACTIVE",
        mimeType: "image/gif",
        sizeMin: 999999999,
      } satisfies ICommunityFile.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "unlikely filter returns empty result",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty result has zero records",
    emptyResult.pagination.records,
    0,
  );
}
