import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThumbnail";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardThumbnailCollector {
  export async function collect(props: {
    body: IDiscussionBoardThumbnail.ICreate;
  }) {
    return {
      id: v4(),
      width: 1200,
      height: 630,
      file_path: `/thumbnails/article/${props.body.article_id}.webp`,
      mime_type: "image/webp",
      created_at: new Date(),
      attachment: {
        connect: { id: props.body.article_id },
      },
    } satisfies Prisma.discussion_board_thumbnailsCreateInput;
  }
}
