import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachmentThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentThumbnail";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_attachment_thumbnail } from "../prepare/prepare_random_reddit_like_attachment_thumbnail";

export async function generate_random_reddit_like_owner_attachments_generate_thumbnails_generate_thumbnails(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikeAttachmentThumbnail.ICreate> | undefined;
    params: {
      attachmentId: string;
    };
  },
): Promise<IRedditLikeAttachmentThumbnail> {
  const prepared: IRedditLikeAttachmentThumbnail.ICreate =
    prepare_random_reddit_like_attachment_thumbnail(props.body);
  return await api.functional.redditLike.owner.attachments.generate_thumbnails.generateThumbnails(
    connection,
    {
      body: prepared,
      attachmentId: props.params.attachmentId,
    },
  );
}
