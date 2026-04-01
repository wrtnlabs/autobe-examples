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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const skip = (page - 1) * limit;
  const member = await MyGlobal.prisma.hrms_members.findUniqueOrThrow({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
  });
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (organizationMember === null) {
    throw new HttpException("No organization membership found", 403);
  }
  const organizationId = organizationMember.hrms_organization_id;
  const allowedSortFields = [
    "filename",
    "file_size",
    "created_at",
    "updated_at",
    "validation_status",
    "file_category",
  ];
  const sortBy = props.body.sortBy ?? "created_at";
  if (!allowedSortFields.includes(sortBy)) {
    throw new HttpException("Invalid sort field", 400);
  }
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput = {
    [sortBy]: sortOrder,
  } satisfies Prisma.hrms_filesOrderByWithRelationInput;
  const whereInput: Prisma.hrms_filesWhereInput = {
    organization_id: organizationId,
    deleted_at: null,
    ...(props.body.category !== undefined && {
      file_category: props.body.category,
    }),
    ...(props.body.validationStatus !== undefined && {
      validation_status: props.body.validationStatus,
    }),
    ...(props.body.ownerType !== null &&
      props.body.ownerType !== undefined && {
        owner_type: props.body.ownerType,
      }),
    ...(props.body.ownerId !== null &&
      props.body.ownerId !== undefined && {
        owner_id: props.body.ownerId,
      }),
    ...(props.body.filename !== undefined && {
      filename: {
        contains: props.body.filename,
        mode: "insensitive",
      },
    }),
  };
  if (props.body.startDate !== undefined || props.body.endDate !== undefined) {
    whereInput.created_at = {};
    if (props.body.startDate !== undefined) {
      whereInput.created_at.gte = new Date(props.body.startDate);
    }
    if (props.body.endDate !== undefined) {
      whereInput.created_at.lte = new Date(props.body.endDate);
    }
  }
  const [data, total] = await Promise.all([
    MyGlobal.prisma.hrms_files.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...HrmsFileAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.hrms_files.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      HrmsFileAtSummaryTransformer.transform,
    ),
  } satisfies IPageIHrmsFile.ISummary;
}
