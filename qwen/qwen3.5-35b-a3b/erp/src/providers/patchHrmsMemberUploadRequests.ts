import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsDateRange";
import { IHrmsFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFileUpload";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsFileUpload";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsFileUploadAtSummaryTransformer } from "../transformers/HrmsFileUploadAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmsMemberUploadRequests(props: {
  member: MemberPayload;
  body: IHrmsFileUpload.IRequest;
}): Promise<IPageIHrmsFileUpload.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Validate status if provided
  const validStatuses = ["pending", "validated", "stored", "failed"] as const;
  const whereStatus: "pending" | "validated" | "stored" | "failed" | undefined =
    props.body.status
      ? validStatuses.includes(props.body.status)
        ? props.body.status
        : undefined
      : undefined;
  // Build where clause
  const where: Prisma.hrms_file_uploadsWhereInput = {
    deleted_at: null,
  };
  // Filter by status
  if (whereStatus) {
    where.upload_state = whereStatus;
  }
  // Filter by organizationId (admin-only for cross-org)
  if (props.body.organizationId) {
    where.organization_id = props.body.organizationId;
  }
  // Filter by employeeId (defaults to current member if not specified)
  if (props.body.employeeId) {
    where.member_id = props.body.employeeId;
  } else {
    // Regular employees default to their own uploads
    where.member_id = props.member.id;
  }
  // Filter by dateRange using string date comparisons
  if (props.body.dateRange) {
    const { startDate, endDate } = props.body.dateRange;
    if (startDate && endDate) {
      where.created_at = {
        gte: toISOStringSafe(new Date(startDate + "T00:00:00Z")),
        lte: toISOStringSafe(new Date(endDate + "T23:59:59Z")),
      };
    } else if (startDate) {
      where.created_at = {
        gte: toISOStringSafe(new Date(startDate + "T00:00:00Z")),
      };
    } else if (endDate) {
      where.created_at = {
        lte: toISOStringSafe(new Date(endDate + "T23:59:59Z")),
      };
    }
  }
  // Filter by fileType with case-insensitive contains
  if (props.body.fileType) {
    where.file_type = {
      contains: props.body.fileType,
      mode: "insensitive",
    };
  }
  // Build orderBy with satisfies for type safety
  const orderBy: Prisma.hrms_file_uploadsOrderByWithRelationInput[] = [
    props.body.sortBy === "created_at"
      ? { created_at: (props.body.sortOrder ?? "desc") as "asc" | "desc" }
      : props.body.sortBy === "status"
        ? { upload_state: (props.body.sortOrder ?? "desc") as "asc" | "desc" }
        : props.body.sortBy === "file_name"
          ? {
              original_filename: (props.body.sortOrder ?? "desc") as
                | "asc"
                | "desc",
            }
          : props.body.sortBy === "upload_state"
            ? {
                upload_state: (props.body.sortOrder ?? "desc") as
                  | "asc"
                  | "desc",
              }
            : { created_at: "desc" as const },
  ];
  // Query data and total count sequentially
  const data = await MyGlobal.prisma.hrms_file_uploads.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...HrmsFileUploadAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrms_file_uploads.count({
    where,
  });
  // Transform and return paginated result
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      HrmsFileUploadAtSummaryTransformer.transform,
    ),
  };
}
