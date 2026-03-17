import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_thumbnail_retrieval_parent_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(authorized);
  // 2. Create two separate image attachments
  const attachment1 =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      {
        body: {
          fileUri: typia.random<string & tags.Format<"uri">>(),
          originalFilename: RandomGenerator.name(2),
        } satisfies IRedditLikeAttachment.ICreate,
      },
    );
  typia.assert(attachment1);
  const attachment2 =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      {
        body: {
          fileUri: typia.random<string & tags.Format<"uri">>(),
          originalFilename: RandomGenerator.name(2),
        } satisfies IRedditLikeAttachment.ICreate,
      },
    );
  typia.assert(attachment2);
  // 3. Generate a thumbnail variant for attachment1 only
  const thumbnail1 =
    await generate_random_reddit_like_member_attachments_generate_thumbnails_generate_thumbnails(
      memberConnection,
      {
        body: {
          width: 200,
          height: 200,
          quality: 80,
          format: "jpeg",
        } satisfies IRedditLikeAttachmentThumbnail.ICreate,
        params: {
          attachmentId: attachment1.id,
        },
      },
    );
  typia.assert(thumbnail1);
  // 4. Test parent mismatch - thumbnail1 belongs to attachment1, but query with attachment2
  await TestValidator.error(
    "thumbnail not accessible from different attachment",
    async () => {
      await api.functional.redditLike.attachments.thumbnails.at(
        memberConnection,
        {
          attachmentId: attachment2.id,
          thumbnailId: thumbnail1.id,
        },
      );
    },
  );
}
