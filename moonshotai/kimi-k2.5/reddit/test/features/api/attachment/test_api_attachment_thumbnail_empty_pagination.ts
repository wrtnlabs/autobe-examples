import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeAttachmentThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeAttachmentThumbnail";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeAttachmentThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentThumbnail";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_attachments_create } from "../../../generate/generate_random_reddit_like_member_attachments_create";
import { prepare_random_reddit_like_attachment } from "../../../prepare/prepare_random_reddit_like_attachment";

export async function test_api_attachment_thumbnail_empty_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Upload a file attachment (non-image files won't have thumbnails)
  const attachment: IRedditLikeAttachment =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      {},
    );
  typia.assert(attachment);
  // Step 3: Query thumbnails endpoint with pagination
  const paginationResponse: IPageIRedditLikeAttachmentThumbnail.ISummary =
    await api.functional.redditLike.attachments.thumbnails.index(
      memberConnection,
      {
        attachmentId: attachment.id,
        body: {
          width: null,
          height: null,
          quality: null,
          format: null,
          page: 1,
          limit: 10,
        } satisfies IRedditLikeAttachmentThumbnail.IRequest,
      },
    );
  typia.assert(paginationResponse);
  // Step 4: Validate empty pagination results
  TestValidator.equals(
    "thumbnail data array is empty",
    paginationResponse.data,
    [],
  );
  TestValidator.equals(
    "pagination metadata records is 0",
    paginationResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination metadata pages is 0",
    paginationResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current page is 1",
    paginationResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    paginationResponse.pagination.limit,
    10,
  );
}
