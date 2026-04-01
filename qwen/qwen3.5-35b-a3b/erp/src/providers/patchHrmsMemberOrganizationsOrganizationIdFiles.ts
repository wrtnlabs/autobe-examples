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

export async function patchHrmsMemberOrganizationsOrganizationIdFiles(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmsFile.IRequest;
}): Promise<IPageIHrmsFile.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const whereInput: Prisma.hrms_filesWhereInput = {
    organization_id: props.organizationId,
    deleted_at: props.body.includeDeleted ? undefined : null,
    ...(props.body.category !== undefined && {
      file_category: props.body.category,
    }),
    ...(props.body.validationStatus !== undefined && {
      validation_status: props.body.validationStatus,
    }),
    ...(props.body.ownerType !== null && {
      owner_type: props.body.ownerType,
    }),
    ...(props.body.ownerId !== null &&
      props.body.ownerType === "member" && {
        owner_id: props.body.ownerId,
      }),
    ...(props.body.filename !== undefined && {
      filename: {
        contains: props.body.filename,
        mode: "insensitive",
      },
    }),
    ...(props.body.startDate !== undefined && {
      created_at: {
        gte: new Date(props.body.startDate),
      },
    }),
    ...(props.body.endDate !== undefined && {
      created_at: {
        lte: new Date(props.body.endDate),
      },
    }),
  } satisfies Prisma.hrms_filesWhereInput;
  const defaultSortOrder: "asc" | "desc" = "desc";
  const sortBy: string | undefined = props.body.sortBy ?? "created_at";
  const sortOrder: "asc" | "desc" =
    props.body.sortOrder === "asc" || props.body.sortOrder === "desc"
      ? props.body.sortOrder
      : defaultSortOrder;
  const orderByInput: Prisma.hrms_filesOrderByWithRelationInput[] = [
    {
      [sortBy]: sortOrder,
    },
  ] satisfies Prisma.hrms_filesOrderByWithRelationInput[];
  const data = await MyGlobal.prisma.hrms_files.findMany({
    where: whereInput,
    take: limit,
    skip,
    orderBy: orderByInput,
    ...HrmsFileAtSummaryTransformer.select(),
  });
  const total: number = await MyGlobal.prisma.hrms_files.count({
    where: whereInput,
  });
  const totalPages: number = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmsFileAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
  };
}
