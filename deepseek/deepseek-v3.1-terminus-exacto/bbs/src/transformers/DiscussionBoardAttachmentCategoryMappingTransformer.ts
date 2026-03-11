import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IDiscussionBoardAttachmentCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategory";
import { IDiscussionBoardAttachmentCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategoryMapping";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAttachmentAtSummaryTransformer } from "./DiscussionBoardAttachmentAtSummaryTransformer";
import { DiscussionBoardAttachmentCategoryAtSummaryTransformer } from "./DiscussionBoardAttachmentCategoryAtSummaryTransformer";

export namespace DiscussionBoardAttachmentCategoryMappingTransformer {
  export type Payload =
    Prisma.discussion_board_attachment_category_mappingsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        attachment: DiscussionBoardAttachmentAtSummaryTransformer.select(),
        category:
          DiscussionBoardAttachmentCategoryAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_attachment_category_mappingsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAttachmentCategoryMapping> {
    return {
      id: input.id,
      attachment: await DiscussionBoardAttachmentAtSummaryTransformer.transform(
        input.attachment,
      ),
      category:
        await DiscussionBoardAttachmentCategoryAtSummaryTransformer.transform(
          input.category,
        ),
      created_at: input.created_at.toISOString(),
    };
  }
}
