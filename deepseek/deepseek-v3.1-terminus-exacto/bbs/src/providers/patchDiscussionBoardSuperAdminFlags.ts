import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentFlag";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminFlags(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardContentFlag.IRequest;
}): Promise<IPageIDiscussionBoardContentFlag> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause with all filtering options
  const whereInput = {
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.flag_reason && {
      flag_reason: {
        contains: props.body.flag_reason,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.created_at_start &&
      props.body.created_at_end && {
        created_at: {
          gte: toISOStringSafe(props.body.created_at_start),
          lte: toISOStringSafe(props.body.created_at_end),
        },
      }),
    ...(props.body.created_at_start &&
      !props.body.created_at_end && {
        created_at: { gte: toISOStringSafe(props.body.created_at_start) },
      }),
    ...(!props.body.created_at_start &&
      props.body.created_at_end && {
        created_at: { lte: toISOStringSafe(props.body.created_at_end) },
      }),
    ...(props.body.resolved_at_start &&
      props.body.resolved_at_end && {
        resolved_at: {
          gte: toISOStringSafe(props.body.resolved_at_start),
          lte: toISOStringSafe(props.body.resolved_at_end),
        },
      }),
    ...(props.body.resolved_at_start &&
      !props.body.resolved_at_end && {
        resolved_at: { gte: toISOStringSafe(props.body.resolved_at_start) },
      }),
    ...(!props.body.resolved_at_start &&
      props.body.resolved_at_end && {
        resolved_at: { lte: toISOStringSafe(props.body.resolved_at_end) },
      }),
    ...(props.body.flagged_article_id && {
      flagged_article_id: props.body.flagged_article_id,
    }),
    ...(props.body.flagged_comment_id && {
      flagged_comment_id: props.body.flagged_comment_id,
    }),
    ...(props.body.reporter_user_id && {
      reporter_user_id: props.body.reporter_user_id,
    }),
    ...(props.body.reviewing_admin_id && {
      reviewing_admin_id: props.body.reviewing_admin_id,
    }),
  } satisfies Prisma.discussion_board_content_flagsWhereInput;
  // Get paginated data with all joins
  const data = await MyGlobal.prisma.discussion_board_content_flags.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    select: {
      id: true,
      flag_reason: true,
      status: true,
      resolution_reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      resolved_at: true,
      reporter: {
        select: {
          id: true,
          display_name: true,
          bio: true,
          created_at: true,
        },
      } satisfies Prisma.discussion_board_usersFindManyArgs,
      flaggedArticle: {
        select: {
          id: true,
          title: true,
          status: true,
          created_at: true,
          author: {
            select: {
              id: true,
              display_name: true,
              bio: true,
              created_at: true,
            },
          } satisfies Prisma.discussion_board_usersFindManyArgs,
          section: {
            select: {
              id: true,
              name: true,
              description: true,
              status: true,
              display_order: true,
              deleted_at: true,
            },
          } satisfies Prisma.discussion_board_sectionsFindManyArgs,
        },
      } satisfies Prisma.discussion_board_articlesFindManyArgs,
      flaggedComment: {
        select: {
          id: true,
          content: true,
          created_at: true,
          updated_at: true,
          author: {
            select: {
              id: true,
              display_name: true,
              bio: true,
              created_at: true,
            },
          } satisfies Prisma.discussion_board_usersFindManyArgs,
        },
      } satisfies Prisma.discussion_board_commentsFindManyArgs,
      reviewingAdmin: {
        select: {
          id: true,
          email: true,
          display_name: true,
          created_at: true,
        },
      } satisfies Prisma.discussion_board_adminsFindManyArgs,
    },
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.discussion_board_content_flags.count({
    where: whereInput,
  });
  // Transform data to match IDiscussionBoardContentFlag format
  const transformedData = data.map((flag) => {
    // Handle reporter
    const reporter = {
      id: flag.reporter.id as string & tags.Format<"uuid">,
      display_name: flag.reporter.display_name,
      bio: flag.reporter.bio ?? undefined,
      created_at: toISOStringSafe(flag.reporter.created_at),
    };
    // Handle flaggedArticle if present
    const flaggedArticle = flag.flaggedArticle
      ? {
          id: flag.flaggedArticle.id as string & tags.Format<"uuid">,
          title: flag.flaggedArticle.title,
          status: flag.flaggedArticle.status,
          created_at: toISOStringSafe(flag.flaggedArticle.created_at),
          author: {
            id: flag.flaggedArticle.author.id as string & tags.Format<"uuid">,
            display_name: flag.flaggedArticle.author.display_name,
            bio: flag.flaggedArticle.author.bio ?? undefined,
            created_at: toISOStringSafe(flag.flaggedArticle.author.created_at),
          },
          section: {
            id: flag.flaggedArticle.section.id as string & tags.Format<"uuid">,
            name: flag.flaggedArticle.section.name,
            description: flag.flaggedArticle.section.description,
            status: flag.flaggedArticle.section.status,
            display_order: flag.flaggedArticle.section.display_order,
            deleted_at: flag.flaggedArticle.section.deleted_at
              ? toISOStringSafe(flag.flaggedArticle.section.deleted_at)
              : undefined,
          },
        }
      : undefined;
    // Handle flaggedComment if present
    const flaggedComment = flag.flaggedComment
      ? {
          id: flag.flaggedComment.id as string & tags.Format<"uuid">,
          content: flag.flaggedComment.content,
          created_at: toISOStringSafe(flag.flaggedComment.created_at),
          updated_at: toISOStringSafe(flag.flaggedComment.updated_at),
          author: {
            id: flag.flaggedComment.author.id as string & tags.Format<"uuid">,
            display_name: flag.flaggedComment.author.display_name,
            bio: flag.flaggedComment.author.bio ?? undefined,
            created_at: toISOStringSafe(flag.flaggedComment.author.created_at),
          },
        }
      : undefined;
    // Handle reviewingAdmin if present
    const reviewingAdmin = flag.reviewingAdmin
      ? {
          id: flag.reviewingAdmin.id as string & tags.Format<"uuid">,
          email: flag.reviewingAdmin.email as string & tags.Format<"email">,
          display_name: flag.reviewingAdmin.display_name,
          created_at: toISOStringSafe(flag.reviewingAdmin.created_at),
        }
      : undefined;
    return {
      id: flag.id as string & tags.Format<"uuid">,
      flag_reason: flag.flag_reason,
      status: flag.status,
      resolution_reason: flag.resolution_reason ?? undefined,
      created_at: toISOStringSafe(flag.created_at),
      updated_at: toISOStringSafe(flag.updated_at),
      deleted_at: flag.deleted_at
        ? toISOStringSafe(flag.deleted_at)
        : undefined,
      resolved_at: flag.resolved_at
        ? toISOStringSafe(flag.resolved_at)
        : undefined,
      reporter,
      flaggedArticle,
      flaggedComment,
      reviewingAdmin,
    };
  });
  // Return the correct pagination structure
  return {
    data: transformedData,
    pagination: {
      pagination: {
        pagination: {
          pagination: {
            current: page,
            limit: limit,
            records: total,
            pages: Math.ceil(total / limit),
          },
        },
      },
    },
  };
}
