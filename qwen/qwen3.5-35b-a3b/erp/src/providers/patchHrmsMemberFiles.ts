import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFile";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsFile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsFileAtSummaryTransformer } from "../transformers/HrmsFileAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmsMemberFiles(props: {
  member: MemberPayload;
  body: IHrmsFile.IRequest;
}): Promise<IPageIHrmsFile.ISummary> {
  // Get authenticated member's organization membership
  const memberMembership =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        hrms_organization_id: true,
      },
    });
  if (memberMembership === null) {
    throw new HttpException("You're not enrolled", 403);
  }
  const organizationId = memberMembership.hrms_organization_id;
  // Validate pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safePage = Math.max(page, 1);
  const skip = (safePage - 1) * safeLimit;
  // Build filter conditions
  const whereInput: Prisma.hrms_filesWhereInput = {
    organization_id: organizationId,
    deleted_at: null,
  };
  if (props.body.category !== undefined) {
    whereInput.file_category = props.body.category;
  }
  if (props.body.validationStatus !== undefined) {
    whereInput.validation_status = props.body.validationStatus;
  }
  if (props.body.ownerId !== null) {
    whereInput.owner_id = props.body.ownerId;
  }
  if (props.body.ownerType !== null) {
    whereInput.owner_type = props.body.ownerType;
  }
  if (props.body.filename !== undefined) {
    whereInput.filename = {
      contains: props.body.filename,
      mode: "insensitive" as const,
    };
  }
  if (props.body.startDate !== undefined) {
    whereInput.created_at = {
      gte: new Date(props.body.startDate),
    };
  }
  if (props.body.endDate !== undefined) {
    const existingFilter = whereInput.created_at;
    if (typeof existingFilter === "string" || existingFilter instanceof Date) {
      whereInput.created_at = {
        gte: existingFilter,
        lte: new Date(props.body.endDate),
      };
    } else if (typeof existingFilter === "object" && existingFilter !== null) {
      whereInput.created_at = {
        ...existingFilter,
        lte: new Date(props.body.endDate),
      };
    } else {
      whereInput.created_at = {
        lte: new Date(props.body.endDate),
      };
    }
  }
  // Validate date range
  if (props.body.startDate !== undefined && props.body.endDate !== undefined) {
    const start = props.body.startDate;
    const end = props.body.endDate;
    if (start > end) {
      throw new HttpException("start_date must be <= end_date", 400);
    }
  }
  // Build order by
  const orderByInput: Prisma.hrms_filesOrderByWithRelationInput =
    ((): Prisma.hrms_filesOrderByWithRelationInput => {
      switch (props.body.sortBy) {
        case "filename":
          return { filename: props.body.sortOrder ?? "asc" };
        case "file_size":
          return { file_size: props.body.sortOrder ?? "asc" };
        case "created_at":
          return { created_at: props.body.sortOrder ?? "desc" };
        case "updated_at":
          return { updated_at: props.body.sortOrder ?? "desc" };
        case "validation_status":
          return { validation_status: props.body.sortOrder ?? "asc" };
        case "file_category":
          return { file_category: props.body.sortOrder ?? "asc" };
        default:
          return { created_at: "desc" };
      }
    })() satisfies Prisma.hrms_filesOrderByWithRelationInput;
  // Query files
  const [files, total] = await Promise.all([
    MyGlobal.prisma.hrms_files.findMany({
      where: whereInput,
      skip,
      take: safeLimit,
      orderBy: orderByInput,
      ...HrmsFileAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.hrms_files.count({ where: whereInput }),
  ]);
  // Transform files
  const transformedFiles = await ArrayUtil.asyncMap(
    files,
    HrmsFileAtSummaryTransformer.transform,
  );
  // Build pagination
  const pages = total === 0 ? 0 : Math.ceil(total / safeLimit);
  return {
    data: transformedFiles,
    pagination: {
      current: safePage,
      limit: safeLimit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  } satisfies IPageIHrmsFile.ISummary;
}
