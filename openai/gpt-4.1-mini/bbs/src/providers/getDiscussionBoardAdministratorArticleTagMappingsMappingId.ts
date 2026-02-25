import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdministratorArticleTagMappingsMappingId(props: {
  administrator: AdministratorPayload;
  mappingId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleTagMapping> {
  const mappingRecord =
    await MyGlobal.prisma.discussion_board_article_tag_mappings.findUniqueOrThrow(
      {
        where: { id: props.mappingId },
        select: {
          id: true,
          discussion_board_article_id: true,
          discussion_board_tag_id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  return {
    id: mappingRecord.id,
    article: {
      id: mappingRecord.discussion_board_article_id,
    } satisfies {
      id: string & tags.Format<"uuid">;
    },
    tag: {
      id: mappingRecord.discussion_board_tag_id,
    } satisfies {
      id: string & tags.Format<"uuid">;
    },
    createdAt: mappingRecord.created_at.toISOString(),
    updatedAt: mappingRecord.updated_at.toISOString(),
    deletedAt:
      mappingRecord.deleted_at === null
        ? null
        : mappingRecord.deleted_at.toISOString(),
  };
}
