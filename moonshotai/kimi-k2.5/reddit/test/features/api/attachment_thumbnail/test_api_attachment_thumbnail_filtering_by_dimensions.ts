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
import { generate_random_reddit_like_member_attachments_generate_thumbnails_generate_thumbnails } from "../../../generate/generate_random_reddit_like_member_attachments_generate_thumbnails_generate_thumbnails";
import { prepare_random_reddit_like_attachment } from "../../../prepare/prepare_random_reddit_like_attachment";
import { prepare_random_reddit_like_attachment_thumbnail } from "../../../prepare/prepare_random_reddit_like_attachment_thumbnail";

export async function test_api_attachment_thumbnail_filtering_by_dimensions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Upload an attachment as base for thumbnails
  const attachment =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      {
        body: {
          fileUri: "https://example.com/test-image.jpg",
          originalFilename: "test-image.jpg",
        },
      },
    );
  typia.assert(attachment);
  // 3. Generate multiple thumbnail variants with different specifications
  const thumbnailSpecs: IRedditLikeAttachmentThumbnail.ICreate[] = [
    { width: 200, height: 200, quality: 80, format: "jpeg" },
    { width: 200, height: 200, quality: 90, format: "jpeg" },
    { width: 100, height: 100, quality: 80, format: "jpeg" },
    { width: 300, height: 300, quality: 70, format: "webp" },
  ];
  const generatedThumbnails: IRedditLikeAttachmentThumbnail[] = [];
  for (const spec of thumbnailSpecs) {
    const thumbnail =
      await generate_random_reddit_like_member_attachments_generate_thumbnails_generate_thumbnails(
        memberConnection,
        {
          body: spec,
          params: { attachmentId: attachment.id },
        },
      );
    typia.assert(thumbnail);
    generatedThumbnails.push(thumbnail);
  }
  // 4. Query thumbnails with filter criteria (width=200, height=200, quality=80)
  const filteredResult: IPageIRedditLikeAttachmentThumbnail.ISummary =
    await api.functional.redditLike.attachments.thumbnails.index(connection, {
      attachmentId: attachment.id,
      body: {
        width: 200,
        height: 200,
        quality: 80,
        format: null,
        page: null,
        limit: null,
      },
    });
  typia.assert(filteredResult);
  // 5. Validate filter results - only matching thumbnails should be returned
  TestValidator.predicate(
    "only one thumbnail should match the filter",
    filteredResult.pagination.records === 1,
  );
  TestValidator.equals(
    "filtered data length should be 1",
    filteredResult.data.length,
    1,
  );
  const matchedThumbnail = filteredResult.data[0];
  TestValidator.equals(
    "thumbnail width should match filter",
    matchedThumbnail.width,
    200,
  );
  TestValidator.equals(
    "thumbnail height should match filter",
    matchedThumbnail.height,
    200,
  );
  TestValidator.equals(
    "thumbnail quality should match filter",
    matchedThumbnail.quality,
    80,
  );
  // 6. Verify non-matching thumbnails are excluded
  const nonMatchingThumbnails = generatedThumbnails.filter(
    (t) => t.width !== 200 || t.height !== 200 || t.quality !== 80,
  );
  TestValidator.predicate(
    "non-matching thumbnails should be excluded from results",
    nonMatchingThumbnails.every(
      (nt) => !filteredResult.data.some((r) => r.id === nt.id),
    ),
  );
}
