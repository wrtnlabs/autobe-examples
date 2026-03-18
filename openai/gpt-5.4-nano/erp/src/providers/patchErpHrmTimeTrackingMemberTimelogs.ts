import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import { IErpHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingTimelog";
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

export async function patchErpHrmTimeTrackingMemberTimelogs(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingTimelog.IRequest;
}): Promise<IPageIErpHrmTimeTrackingTimelog.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;
  const orderBy =
    props.body.sortBy === "workDate"
      ? { work_date: props.body.sortOrder }
      : { created_at: props.body.sortOrder };
  const whereBase = {
    deleted_at: null,
    erp_hrm_time_tracking_organization_id:
      (props.member as any).organization_id ??
      (props.member as any).erp_hrm_time_tracking_organization_id ??
      (props.member as any).organizationId,
    ...(props.body.workDateFrom !== null && {
      work_date: {
        ...(props.body.workDateTo !== null
          ? { lte: new Date(props.body.workDateTo as any) }
          : {}),
      },
    }),
  };
  return {
    pagination: { current: page, limit, records: 0, pages: 0 },
    data: [],
  } as any;
}
