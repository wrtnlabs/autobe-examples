import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardArticleAtSummaryTransformer } from "./DiscussionBoardArticleAtSummaryTransformer";
import { DiscussionBoardMemberAtSummaryTransformer } from "./DiscussionBoardMemberAtSummaryTransformer";

export namespace DiscussionBoardArticleFileTransformer {
  export type Payload = Prisma.discussion_board_article_filesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        original_name: true,
        mime_type: true,
        size: true,
        path: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        article: DiscussionBoardArticleAtSummaryTransformer.select(),
        member: DiscussionBoardMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_article_filesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleFile> {
    return {
      id: input.id,
      name: input.name,
      original_name: input.original_name,
      mime_type: input.mime_type,
      size: input.size,
      path: input.path,
      article: await DiscussionBoardArticleAtSummaryTransformer.transform(
        input.article,
      ),
      member: await DiscussionBoardMemberAtSummaryTransformer.transform(
        input.member,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
