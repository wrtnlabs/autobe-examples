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
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardRegisteredUserArticleTagMappingsMappingId(props: {
  registeredUser: RegistereduserPayload;
  mappingId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleTagMapping> {
  const record =
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
  const createdAt = toISOStringSafe(record.created_at) as string &
    tags.Format<"date-time">;
  const updatedAt = toISOStringSafe(record.updated_at) as string &
    tags.Format<"date-time">;
  const deletedAt: (string & tags.Format<"date-time">) | null =
    record.deleted_at === null
      ? null
      : (toISOStringSafe(record.deleted_at) as string &
          tags.Format<"date-time">);
  return {
    id: record.id,
    article: {
      id: record.discussion_board_article_id,
      title: "",
      author: {
        id: "",
        email: "",
        displayName: "",
        isBanned: false,
        createdAt: createdAt,
        updatedAt: updatedAt,
      },
      section: {
        id: "",
        name: "",
        description: "",
        createdAt: createdAt,
        updatedAt: updatedAt,
      },
      commentCount: 0,
      createdAt: createdAt,
      tags: [],
    },
    tag: { id: record.discussion_board_tag_id },
    createdAt,
    updatedAt,
    deletedAt,
  };
}
