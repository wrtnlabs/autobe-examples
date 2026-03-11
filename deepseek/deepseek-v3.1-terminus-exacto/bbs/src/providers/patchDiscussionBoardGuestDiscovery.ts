import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { DiscussionBoardArticleAtSummaryTransformer } from "../transformers/DiscussionBoardArticleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardGuestDiscovery(props: {
  guest: GuestPayload;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  // Validate and set pagination parameters
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(100, Math.max(1, props.body.limit ?? 100));
  const skip = (page - 1) * limit;
  // Build where clause with search, section filter, and security
  const whereInput = {
    deleted_at: null,
    status: "published",
    section: {
      deleted_at: null, // Only active sections
    },
    ...(props.body.search && {
      OR: [
        { title: { contains: props.body.search } },
        { body: { contains: props.body.search } },
      ],
    }),
    ...(props.body.discussion_board_section_id && {
      discussion_board_section_id: props.body.discussion_board_section_id,
    }),
  } satisfies Prisma.discussion_board_articlesWhereInput;
  // Get paginated articles with relations using proper select
  const articles = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    include: {
      author: {
        select: {
          id: true,
          display_name: true,
          bio: true,
        },
      },
      section: {
        select: {
          id: true,
          name: true,
          description: true,
          created_at: true,
        },
      },
      tags: {
        select: {
          id: true,
          created_at: true,
          updated_at: true,
        },
      },
      comments: {
        select: {
          id: true,
        },
      },
      snapshots: {
        select: {
          id: true,
        },
      },
      viewStats: {
        select: {
          id: true,
        },
      },
      favorites: {
        select: {
          id: true,
        },
      },
      reactions: {
        select: {
          id: true,
        },
      },
      metadatum: {
        select: {
          id: true,
        },
      },
      commentStatistic: {
        select: {
          id: true,
        },
      },
      attachments: {
        select: {
          id: true,
        },
      },
    },
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: whereInput,
  });
  // Transform articles using the transformer
  const transformedArticles = await ArrayUtil.asyncMap(
    articles,
    DiscussionBoardArticleAtSummaryTransformer.transform,
  );
  return {
    data: transformedArticles,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
