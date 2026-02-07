import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardArticleFileAtSummaryTransformer } from "./DiscussionBoardArticleFileAtSummaryTransformer";
import { DiscussionBoardCommentAtSummaryTransformer } from "./DiscussionBoardCommentAtSummaryTransformer";

export namespace DiscussionBoardCommentAttachmentTransformer {
  export type Payload = Prisma.discussion_board_comment_attachmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        comment: DiscussionBoardCommentAtSummaryTransformer.select(),
        file: DiscussionBoardArticleFileAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_comment_attachmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCommentAttachment> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      comment: await DiscussionBoardCommentAtSummaryTransformer.transform(
        input.comment,
      ),
      file: await DiscussionBoardArticleFileAtSummaryTransformer.transform(
        input.file,
      ),
    };
  }
}
