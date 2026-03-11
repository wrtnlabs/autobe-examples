import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardMemberAtSummaryTransformer } from "../transformers/DiscussionBoardMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardMembers(props: {
  body: IDiscussionBoardMember.IRequest;
}): Promise<IPageIDiscussionBoardMember.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;
  // Build WHERE clause with all filter conditions
  const whereConditions: Prisma.discussion_board_membersWhereInput[] = [
    { deleted_at: null }, // Exclude soft-deleted accounts
  ];
  // Search filter (OR condition across email and display_name)
  if (props.body.search) {
    whereConditions.push({
      OR: [
        {
          email: { contains: props.body.search, mode: "insensitive" as const },
        },
        {
          display_name: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      ],
    });
  }
  // Individual field filters
  if (props.body.email) {
    whereConditions.push({
      email: { contains: props.body.email, mode: "insensitive" as const },
    });
  }
  if (props.body.display_name) {
    whereConditions.push({
      display_name: {
        contains: props.body.display_name,
        mode: "insensitive" as const,
      },
    });
  }
  if (props.body.is_banned !== undefined) {
    whereConditions.push({
      is_banned:
        props.body.is_banned === null ? undefined : props.body.is_banned,
    });
  }
  if (props.body.admin_grade !== undefined) {
    whereConditions.push({ admin_grade: props.body.admin_grade });
  }
  // Date range filters with proper ISO string handling
  if (props.body.created_at_start || props.body.created_at_end) {
    const createdConditions: Prisma.DateTimeFilter = {};
    if (props.body.created_at_start) {
      createdConditions.gte = new Date(props.body.created_at_start);
    }
    if (props.body.created_at_end) {
      createdConditions.lte = new Date(props.body.created_at_end);
    }
    whereConditions.push({ created_at: createdConditions });
  }
  if (props.body.updated_at_start || props.body.updated_at_end) {
    const updatedConditions: Prisma.DateTimeFilter = {};
    if (props.body.updated_at_start) {
      updatedConditions.gte = new Date(props.body.updated_at_start);
    }
    if (props.body.updated_at_end) {
      updatedConditions.lte = new Date(props.body.updated_at_end);
    }
    whereConditions.push({ updated_at: updatedConditions });
  }
  const whereInput = {
    AND: whereConditions,
  } satisfies Prisma.discussion_board_membersWhereInput;
  // Execute parallel queries for data and count
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_members.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardMemberAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_members.count({
      where: whereInput,
    }),
  ]);
  // Transform data using the transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardMemberAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
