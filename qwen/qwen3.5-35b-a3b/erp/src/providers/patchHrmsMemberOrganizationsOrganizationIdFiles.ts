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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrms_filesWhereInput = {
    organization_id: props.organizationId,
    deleted_at: props.body.includeDeleted === true ? undefined : null,
    ...(props.body.category && {
      file_category: props.body.category,
    }),
    ...(props.body.validationStatus && {
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
    ...(props.body.filename && {
      filename: {
        contains: props.body.filename,
        mode: "insensitive",
      },
    }),
    ...(props.body.startDate && {
      created_at: {
        gte: new Date(props.body.startDate),
      },
    }),
    ...(props.body.endDate && {
      created_at: {
        lte: new Date(props.body.endDate),
      },
    }),
  } satisfies Prisma.hrms_filesWhereInput;
  const orderByInput = [
    {
      [props.body.sortBy ?? "created_at"]: (props.body.sortOrder === "desc"
        ? "desc"
        : "asc") as "asc" | "desc",
    },
  ];
  const data = await MyGlobal.prisma.hrms_files.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmsFileAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrms_files.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      async (file) => await HrmsFileAtSummaryTransformer.transform(file),
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIHrmsFile.ISummary;
}
