import { IDiscussionBoardAttachmentCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategoryMapping";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAttachmentCategoryMappingAtResponseItemTransformer } from "./DiscussionBoardAttachmentCategoryMappingAtResponseItemTransformer";

export namespace DiscussionBoardAttachmentCategoryMappingAtResponseTransformer {
  export type Payload =
    Prisma.discussion_board_attachment_category_mappingsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        attachment: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_attachmentsFindManyArgs,
        category: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_attachment_categoriesFindManyArgs,
      },
    } satisfies Prisma.discussion_board_attachment_category_mappingsFindManyArgs;
  }
  export async function transform(
    input: Payload[],
  ): Promise<IDiscussionBoardAttachmentCategoryMapping.IResponse> {
    return {
      mappings: await ArrayUtil.asyncMap(
        input,
        DiscussionBoardAttachmentCategoryMappingAtResponseItemTransformer.transform,
      ),
    };
  }
}
