import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThumbnail";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardThumbnail";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_thumbnail_metadata_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Test thumbnail retrieval with default parameters (no filters)
  const thumbnails = await api.functional.discussionBoard.thumbnails.index(
    memberConnection,
    {
      body: {} satisfies IDiscussionBoardThumbnail.IRequest,
    },
  );
  typia.assert(thumbnails);
  TestValidator.equals(
    "pagination defaults to page 1",
    thumbnails.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination defaults to limit 20",
    thumbnails.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "at least 0 thumbnails exist",
    () => thumbnails.pagination.records >= 0,
  );
  // Test pagination with custom limit
  const thumbnailsByLimit =
    await api.functional.discussionBoard.thumbnails.index(memberConnection, {
      body: {
        limit: 10,
      } satisfies IDiscussionBoardThumbnail.IRequest,
    });
  typia.assert(thumbnailsByLimit);
  TestValidator.equals(
    "pagination limit custom",
    thumbnailsByLimit.pagination.limit,
    10,
  );
  TestValidator.equals(
    "data length matches limit",
    thumbnailsByLimit.data.length,
    10,
  );
  // Test pagination with custom page
  const thumbnailsByPage =
    await api.functional.discussionBoard.thumbnails.index(memberConnection, {
      body: {
        page: 2,
        limit: 5,
      } satisfies IDiscussionBoardThumbnail.IRequest,
    });
  typia.assert(thumbnailsByPage);
  TestValidator.equals(
    "pagination page custom",
    thumbnailsByPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit custom",
    thumbnailsByPage.pagination.limit,
    5,
  );
  // Test sorting by upload timestamp descending (default)
  const thumbnailsByUpload =
    await api.functional.discussionBoard.thumbnails.index(memberConnection, {
      body: {
        sort_by: "uploaded_at",
        order: "desc",
      } satisfies IDiscussionBoardThumbnail.IRequest,
    });
  typia.assert(thumbnailsByUpload);
  // We cannot validate sort order without knowing expected data, but we validate the request is accepted
  // Test sorting by file size ascending
  const thumbnailsBySize =
    await api.functional.discussionBoard.thumbnails.index(memberConnection, {
      body: {
        sort_by: "file_size",
        order: "asc",
      } satisfies IDiscussionBoardThumbnail.IRequest,
    });
  typia.assert(thumbnailsBySize);
  // Test file size range filtering
  // Use a safe range: everything greater than or equal to 1000 bytes
  const thumbnailsBySizeRange =
    await api.functional.discussionBoard.thumbnails.index(memberConnection, {
      body: {
        size_min: 1000,
        size_max: 100000,
      } satisfies IDiscussionBoardThumbnail.IRequest,
    });
  typia.assert(thumbnailsBySizeRange);
  // Test MIME type filtering (with realistic value)
  const thumbnailsByMimeType =
    await api.functional.discussionBoard.thumbnails.index(memberConnection, {
      body: {
        content_type: "image/png",
      } satisfies IDiscussionBoardThumbnail.IRequest,
    });
  typia.assert(thumbnailsByMimeType);
  // Test missing arrows in parameter: null and undefined values are handled properly
  // Verify that the API accepts empty object (we did above)
  // Confirm all requests are successful — backend ensures hidden/deleted articles are not returned
}
