import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeActivityLogEntry";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeActivityLogEntry";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeActivityLogEntryAtSummaryTransformer } from "../transformers/ErpHrmTimeActivityLogEntryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberActivityLogEntries(props: {
  member: MemberPayload;
  body: IErpHrmTimeActivityLogEntry.IRequest;
}): Promise<IPageIErpHrmTimeActivityLogEntry.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  if (
    props.body.createdAtFrom !== undefined &&
    props.body.createdAtTo !== undefined &&
    props.body.createdAtFrom !== null &&
    props.body.createdAtTo !== null &&
    props.body.createdAtFrom > props.body.createdAtTo
  ) {
    throw new HttpException("Invalid date range", 400);
  }
  const orderBy: Prisma.erp_hrm_time_activity_log_entriesOrderByWithRelationInput =
    props.body.sort === undefined ||
    props.body.sort === "" ||
    props.body.sort === "createdAt:desc"
      ? { created_at: "desc" }
      : props.body.sort === "createdAt:asc"
        ? { created_at: "asc" }
        : props.body.sort === "actionType:asc"
          ? { action_type: "asc" }
          : props.body.sort === "actionType:desc"
            ? { action_type: "desc" }
            : props.body.sort === "memberId:asc"
              ? { member_id: "asc" }
              : props.body.sort === "memberId:desc"
                ? { member_id: "desc" }
                : (() => {
                    throw new HttpException("Unsupported sort field", 400);
                  })();
  const where: Prisma.erp_hrm_time_activity_log_entriesWhereInput = {
    deleted_at: null,
    ...(props.body.actionType !== undefined && {
      action_type: props.body.actionType,
    }),
    ...(props.body.memberId !== undefined && {
      member_id: props.body.memberId,
    }),
    ...(props.body.createdAtFrom !== undefined &&
      props.body.createdAtFrom !== null && {
        created_at: {
          gte: props.body.createdAtFrom,
          ...(props.body.createdAtTo !== undefined &&
            props.body.createdAtTo !== null && { lte: props.body.createdAtTo }),
        },
      }),
    ...(props.body.createdAtFrom === undefined &&
      props.body.createdAtTo !== undefined &&
      props.body.createdAtTo !== null && {
        created_at: { lte: props.body.createdAtTo },
      }),
  };
  const data = await MyGlobal.prisma.erp_hrm_time_activity_log_entries.findMany(
    {
      where,
      skip,
      take: limit,
      orderBy,
      ...ErpHrmTimeActivityLogEntryAtSummaryTransformer.select(),
    },
  );
  const records = await MyGlobal.prisma.erp_hrm_time_activity_log_entries.count(
    {
      where,
    },
  );
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmTimeActivityLogEntryAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
  };
}
