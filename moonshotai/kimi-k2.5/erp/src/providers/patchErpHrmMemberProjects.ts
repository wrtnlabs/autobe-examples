import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmProjectAtSummaryTransformer } from "../transformers/ErpHrmProjectAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberProjects(props: {
  member: MemberPayload;
  body: IErpHrmProject.IRequest;
}): Promise<IPageIErpHrmProject.ISummary> {
  // Get member's organization context
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        organization_id: true,
      },
    });
  if (orgMember === null) {
    throw new HttpException(
      "Member is not associated with any organization",
      403,
    );
  }
  const organizationId = orgMember.organization_id;
  // Build where clause with base filters
  const whereInput: Prisma.erp_hrm_projectsWhereInput = {
    organization_id: organizationId,
    deleted_at: null,
  };
  // Apply optional filters
  if (props.body.search !== undefined && props.body.search !== "") {
    whereInput.name = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  if (props.body.status !== undefined && props.body.status !== "") {
    whereInput.status = props.body.status;
  }
  // Date range filters for start_date
  if (
    props.body.startDateFrom !== undefined ||
    props.body.startDateTo !== undefined
  ) {
    whereInput.start_date = {};
    if (props.body.startDateFrom !== undefined) {
      whereInput.start_date.gte = new Date(props.body.startDateFrom);
    }
    if (props.body.startDateTo !== undefined) {
      whereInput.start_date.lte = new Date(props.body.startDateTo);
    }
  }
  // Date range filters for end_date
  if (
    props.body.endDateFrom !== undefined ||
    props.body.endDateTo !== undefined
  ) {
    whereInput.end_date = {};
    if (props.body.endDateFrom !== undefined) {
      whereInput.end_date.gte = new Date(props.body.endDateFrom);
    }
    if (props.body.endDateTo !== undefined) {
      whereInput.end_date.lte = new Date(props.body.endDateTo);
    }
  }
  // Budget hours range filters
  if (
    props.body.budgetHoursFrom !== undefined ||
    props.body.budgetHoursTo !== undefined
  ) {
    whereInput.budget_hours = {};
    if (props.body.budgetHoursFrom !== undefined) {
      whereInput.budget_hours.gte = props.body.budgetHoursFrom;
    }
    if (props.body.budgetHoursTo !== undefined) {
      whereInput.budget_hours.lte = props.body.budgetHoursTo;
    }
  }
  // Pagination parameters
  const limit = props.body.limit ?? 20;
  const page = props.body.page ?? 1;
  // Determine pagination strategy
  let findManyArgs: Prisma.erp_hrm_projectsFindManyArgs;
  if (props.body.cursor !== undefined && props.body.cursor !== "") {
    // Cursor-based pagination
    const cursorParts = props.body.cursor.split("_");
    if (cursorParts.length === 2) {
      findManyArgs = {
        where: whereInput,
        cursor: {
          id: cursorParts[1],
        },
        skip: 1,
        take: limit,
        orderBy: {
          created_at: "desc",
        },
        ...ErpHrmProjectAtSummaryTransformer.select(),
      };
    } else {
      // Invalid cursor, fall back to offset-based
      findManyArgs = {
        where: whereInput,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          created_at: "desc",
        },
        ...ErpHrmProjectAtSummaryTransformer.select(),
      };
    }
  } else {
    // Offset-based pagination
    findManyArgs = {
      where: whereInput,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
      ...ErpHrmProjectAtSummaryTransformer.select(),
    };
  }
  // Execute queries sequentially (not parallel to avoid connection pool pressure)
  const projects =
    await MyGlobal.prisma.erp_hrm_projects.findMany(findManyArgs);
  const total = await MyGlobal.prisma.erp_hrm_projects.count({
    where: whereInput,
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    projects,
    ErpHrmProjectAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
