import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleMetadatum";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticleMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleMetadatum";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardArticleMetadatumAtSummaryTransformer } from "../transformers/DiscussionBoardArticleMetadatumAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardMemberArticlesMetadata(props: {
  member: MemberPayload;
  body: IDiscussionBoardArticleMetadatum.IRequest;
}): Promise<IPageIDiscussionBoardArticleMetadatum.ISummary> {
  // Set pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build reading_time_minutes condition separately to avoid circular reference
  const readingTimeCondition: Prisma.discussion_board_article_metadataWhereInput["reading_time_minutes"] =
    {};
  if (props.body.min_reading_time !== undefined) {
    readingTimeCondition.gte = props.body.min_reading_time;
  }
  if (props.body.max_reading_time !== undefined) {
    readingTimeCondition.lte = props.body.max_reading_time;
  }
  // Build WHERE clause for metadata table
  const whereInput = {
    deleted_at: null, // Soft delete filter
    ...(props.body.is_featured !== undefined && {
      is_featured: props.body.is_featured,
    }),
    ...(Object.keys(readingTimeCondition).length > 0 && {
      reading_time_minutes: readingTimeCondition,
    }),
    ...(props.body.meta_title && {
      meta_title: {
        contains: props.body.meta_title,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.meta_description && {
      meta_description: {
        contains: props.body.meta_description,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.meta_keywords && {
      meta_keywords: {
        contains: props.body.meta_keywords,
        mode: "insensitive" as const,
      },
    }),
    // Join filter: ensure article is not deleted
    article: {
      deleted_at: null,
    },
  } satisfies Prisma.discussion_board_article_metadataWhereInput;
  // Query metadata records with pagination
  const data = await MyGlobal.prisma.discussion_board_article_metadata.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...DiscussionBoardArticleMetadatumAtSummaryTransformer.select(),
    },
  );
  // Get total count for pagination
  const total = await MyGlobal.prisma.discussion_board_article_metadata.count({
    where: whereInput,
  });
  // Transform records
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardArticleMetadatumAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
