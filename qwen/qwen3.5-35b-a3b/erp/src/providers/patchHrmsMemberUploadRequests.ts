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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmsMemberUploadRequests(props: {
  member: MemberPayload;
  body: IHrmsFileUpload.IRequest;
}): Promise<IPageIHrmsFileUpload.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  // Build where filter
  const whereInput: Prisma.hrms_file_uploadsWhereInput = {
    deleted_at: null,
    ...(props.body.status !== undefined && {
      upload_state: props.body.status,
    }),
    ...(props.body.organizationId !== undefined && {
      organization_id: props.body.organizationId,
    }),
    ...(props.body.employeeId !== undefined && {
      member_id: props.body.employeeId,
    }),
    ...(props.body.fileType !== undefined && {
      file_type: props.body.fileType,
    }),
    ...(props.body.dateRange && {
      created_at: {
        ...(props.body.dateRange.startDate !== undefined && {
          gte: new Date(props.body.dateRange.startDate + "T00:00:00.000Z"),
        }),
        ...(props.body.dateRange.endDate !== undefined && {
          lte: new Date(props.body.dateRange.endDate + "T23:59:59.999Z"),
        }),
      },
    }),
  } satisfies Prisma.hrms_file_uploadsWhereInput;
  // Build orderBy
  const orderByInput: Prisma.hrms_file_uploadsOrderByWithRelationInput[] = [];
  if (sortBy === "created_at") {
    orderByInput.push({ created_at: sortOrder as "asc" | "desc" });
  } else if (sortBy === "status") {
    orderByInput.push({ upload_state: sortOrder as "asc" | "desc" });
  } else if (sortBy === "file_name") {
    orderByInput.push({ original_filename: sortOrder as "asc" | "desc" });
  } else if (sortBy === "upload_state") {
    orderByInput.push({ upload_state: sortOrder as "asc" | "desc" });
  }
  // Query
  const data = await MyGlobal.prisma.hrms_file_uploads.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    select: {
      id: true,
      original_filename: true,
      file_type: true,
      file_size: true,
      validation_status: true,
      upload_state: true,
      created_at: true,
      file_id: true,
      permanent_storage_path: true,
      error_message: true,
    },
  });
  const total = await MyGlobal.prisma.hrms_file_uploads.count({
    where: whereInput,
  });
  return {
    data: data.map((item) => ({
      id: item.id,
      originalFilename: item.original_filename,
      fileType: item.file_type,
      fileSize: item.file_size,
      validationStatus: item.validation_status,
      uploadState: item.upload_state,
      createdAt: item.created_at.toISOString(),
      fileId: item.file_id,
      permanentStoragePath: item.permanent_storage_path,
      errorMessage: item.error_message,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
