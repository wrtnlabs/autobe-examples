import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardArticleFileTransformer } from "../transformers/DiscussionBoardArticleFileTransformer";
import { DiscussionBoardArticleImageTransformer } from "../transformers/DiscussionBoardArticleImageTransformer";
import { DiscussionBoardArticleTagAtSummaryTransformer } from "../transformers/DiscussionBoardArticleTagAtSummaryTransformer";
import { DiscussionBoardArticleTransformer } from "../transformers/DiscussionBoardArticleTransformer";
import { DiscussionBoardRegisteredUserAtSummaryTransformer } from "../transformers/DiscussionBoardRegisteredUserAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdministratorArticlesArticleId(props: {
  administrator: AdministratorPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticle> {
  const record =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: {
        id: true,
        title: true,
        content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: DiscussionBoardRegisteredUserAtSummaryTransformer.select(),
        section: {
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        files: DiscussionBoardArticleFileTransformer.select(),
        images: DiscussionBoardArticleImageTransformer.select(),
        tagMappings: {
          select: {
            tag: DiscussionBoardArticleTagAtSummaryTransformer.select(),
          },
        },
      },
    });
  // Convert all Date fields to string using toISOStringSafe
  // Add missing empty arrays for comments, articleTags, searchIndexes
  const transformedInput = {
    ...record,
    created_at: toISOStringSafe(record.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(record.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at:
      record.deleted_at === null
        ? null
        : (toISOStringSafe(record.deleted_at) as string &
            tags.Format<"date-time">),
    comments: [],
    articleTags: [],
    searchIndexes: [],
    section: {
      ...record.section,
      created_at: toISOStringSafe(record.section.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(record.section.updated_at) as string &
        tags.Format<"date-time">,
      deleted_at:
        record.section.deleted_at === null
          ? null
          : (toISOStringSafe(record.section.deleted_at) as string &
              tags.Format<"date-time">),
    },
    author: {
      ...record.author,
      created_at: toISOStringSafe(record.author.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(record.author.updated_at) as string &
        tags.Format<"date-time">,
      deleted_at:
        record.author.deleted_at === null
          ? null
          : (toISOStringSafe(record.author.deleted_at) as string &
              tags.Format<"date-time">),
    },
    files: record.files.map((file) => ({
      ...file,
      created_at: toISOStringSafe(file.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(file.updated_at) as string &
        tags.Format<"date-time">,
      deleted_at:
        file.deleted_at === null
          ? null
          : (toISOStringSafe(file.deleted_at) as string &
              tags.Format<"date-time">),
    })),
    images: record.images.map((image) => ({
      ...image,
      created_at: toISOStringSafe(image.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(image.updated_at) as string &
        tags.Format<"date-time">,
      deleted_at:
        image.deleted_at === null
          ? null
          : (toISOStringSafe(image.deleted_at) as string &
              tags.Format<"date-time">),
    })),
    tagMappings: record.tagMappings.map((mapping) => ({
      tag: {
        ...mapping.tag,
        created_at: toISOStringSafe(mapping.tag.created_at) as string &
          tags.Format<"date-time">,
        updated_at: toISOStringSafe(mapping.tag.updated_at) as string &
          tags.Format<"date-time">,
        deleted_at:
          mapping.tag.deleted_at === null
            ? null
            : (toISOStringSafe(mapping.tag.deleted_at) as string &
                tags.Format<"date-time">),
      },
    })),
  } as unknown as Parameters<
    typeof DiscussionBoardArticleTransformer.transform
  >[0];
  return await DiscussionBoardArticleTransformer.transform(transformedInput);
}
