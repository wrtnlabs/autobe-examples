import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTrackingOrganizationTransformer } from "../transformers/ErpHrmTimeTrackingOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeTrackingMemberOrganizations(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingOrganization.ICreate;
}): Promise<IErpHrmTimeTrackingOrganization> {
  if (props.member.type !== "member") {
    throw new HttpException("Forbidden", 403);
  }
  const now = new Date();
  const createdAt = toISOStringSafe(now);
  const updatedAt = toISOStringSafe(now);
  const data = {
    id: v4(),
    name: props.body.name,
    description: props.body.description,
    logo_url: props.body.logo_url ?? null,
    currency_code: props.body.currency_code,
    timezone: props.body.timezone,
    fiscal_start_month: props.body.fiscal_start_month,
    created_at: createdAt,
    updated_at: updatedAt,
    deleted_at: null as null,
  };
  try {
    const created = await MyGlobal.prisma.$transaction(async (tx) => {
      return tx.erp_hrm_time_tracking_organizations.create({
        data: data as unknown as Prisma.erp_hrm_time_tracking_organizationsCreateInput,
        select: {
          id: true,
          name: true,
          description: true,
          logo_url: true,
          currency_code: true,
          timezone: true,
          fiscal_start_month: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          departments: { select: { id: true } },
          contracts: { select: { id: true } },
          contractSnapshots: { select: { id: true } },
          projects: { select: { id: true } },
          timelogs: { select: { id: true } },
          timesheets: { select: { id: true } },
          timerSessions: { select: { id: true } },
          activityLogEntries: { select: { id: true } },
          activityLogEntrySnapshots: { select: { id: true } },
          reportDefinitions: { select: { id: true } },
        },
      });
    });
    return ErpHrmTimeTrackingOrganizationTransformer.transform(
      created as unknown as Parameters<
        typeof ErpHrmTimeTrackingOrganizationTransformer.transform
      >[0],
    );
  } catch (error) {
    const maybeCode =
      typeof error === "object" && error !== null && "code" in error
        ? (
            error as {
              code?: unknown;
            }
          ).code
        : undefined;
    if (maybeCode === "P2002") {
      throw new HttpException("Organization name already exists", 409);
    }
    throw new HttpException("Internal Server Error", 500);
  }
}
