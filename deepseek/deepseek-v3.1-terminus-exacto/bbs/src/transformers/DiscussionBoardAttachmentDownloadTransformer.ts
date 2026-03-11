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

export namespace DiscussionBoardAttachmentDownloadTransformer {
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
        user_agent: true,
        referrer: true,
        deleted_at: true,
        attachment: DiscussionBoardAttachmentAtSummaryTransformer.select(),
        guestDownloadReference: true,
        downloadOfMember: true,
        adminDownloadReference: true,
        superAdminOwner: true,
      },
    } satisfies Prisma.discussion_board_attachment_downloadsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAttachmentDownload> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      actor_type: input.actor_type,
      ip: input.ip,
      user_agent: input.user_agent,
      referrer: input.referrer ?? null,
      attachment: await DiscussionBoardAttachmentAtSummaryTransformer.transform(
        input.attachment,
      ),
    };
  }
}
