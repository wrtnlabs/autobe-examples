import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachmentThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentThumbnail";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditLikeAttachmentThumbnailCollector {
  export async function collect(props: {
    body: IRedditLikeAttachmentThumbnail.ICreate;
    redditLikeAttachments: IEntity;
    storagePath?: string;
    fileSize?: number;
  }) {
    const id: string = v4();
    return {
      id,
      width: props.body.width,
      height: props.body.height,
      quality: props.body.quality,
      format: props.body.format,
      storage_path: props.storagePath ?? `thumbnails/${id}`,
      file_size: props.fileSize ?? 0,
      created_at: new Date(),
      updated_at: new Date(),
      attachment: { connect: { id: props.redditLikeAttachments.id } },
    } satisfies Prisma.reddit_like_attachment_thumbnailsCreateInput;
  }
}
