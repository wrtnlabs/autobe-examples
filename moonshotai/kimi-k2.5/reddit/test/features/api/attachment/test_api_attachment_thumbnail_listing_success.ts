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

export async function test_api_attachment_thumbnail_listing_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username:
        RandomGenerator.name(1).replace(/\s/g, "_").toLowerCase() +
        RandomGenerator.alphaNumeric(4),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditLikeMember.IJoin,
  });
  // Step 2: Upload an image attachment using utility function
  const attachment =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      {},
    );
  typia.assert(attachment);
  // Step 3: Retrieve thumbnail variants for the uploaded attachment
  const thumbnailList =
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
  typia.assert(thumbnailList);
  // Step 4: Validate pagination metadata shows page 1
  TestValidator.equals(
    "pagination current page",
    thumbnailList.pagination.current,
    1,
  );
  // Step 5: Validate thumbnails are sorted by createdAt descending (newest first) if data exists
  if (thumbnailList.data.length > 1) {
    const createdAts = thumbnailList.data.map((t) =>
      new Date(t.createdAt).getTime(),
    );
    const sortedDescending = [...createdAts].sort((a, b) => b - a);
    TestValidator.predicate(
      "thumbnails sorted by createdAt descending",
      createdAts.every((val, idx) => val === sortedDescending[idx]),
    );
  }
}
