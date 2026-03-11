import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IDiscussionBoardAttachmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentSnapshot";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAttachmentAtSummaryTransformer } from "./DiscussionBoardAttachmentAtSummaryTransformer";

export namespace DiscussionBoardAttachmentSnapshotAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_attachment_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        captured_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        attachment: DiscussionBoardAttachmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_attachment_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAttachmentSnapshot.ISummary> {
    return {
      id: input.id,
      captured_at: input.captured_at.toISOString(),
      attachment: await DiscussionBoardAttachmentAtSummaryTransformer.transform(
        input.attachment,
      ),
    };
  }
}
