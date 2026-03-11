import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IDiscussionBoardAttachmentDownload } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentDownload";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAttachmentAtSummaryTransformer } from "./DiscussionBoardAttachmentAtSummaryTransformer";

export namespace DiscussionBoardAttachmentDownloadAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_attachment_downloadsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        actor_type: true,
        ip: true,
        attachment: DiscussionBoardAttachmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_attachment_downloadsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAttachmentDownload.ISummary> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      actor_type: input.actor_type,
      ip: input.ip,
      attachment: await DiscussionBoardAttachmentAtSummaryTransformer.transform(
        input.attachment,
      ),
    };
  }
}
