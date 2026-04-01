import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmsMemberAtSummaryTransformer } from "./HrmsMemberAtSummaryTransformer";

export namespace HrmsOrganizationAtSummaryTransformer {
  export type Payload = Prisma.hrms_organizationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        logo_uri: true,
        currency: true,
        timezone: true,
        fiscal_start_month: true,
        owner: HrmsMemberAtSummaryTransformer.select(),
        created_at: true,
        updated_at: true,
        deleted_at: true,
        memberSessions: {
          select: { id: true },
        } satisfies Prisma.hrms_member_sessionsFindManyArgs,
        activityLogs: {
          select: { id: true },
        } satisfies Prisma.hrms_activity_logsFindManyArgs,
        organizationMembers: {
          select: { id: true },
        } satisfies Prisma.hrms_organization_membersFindManyArgs,
        roles: {
          select: { id: true },
        } satisfies Prisma.hrms_organization_rolesFindManyArgs,
        departments: {
          select: { id: true },
        } satisfies Prisma.hrms_departmentsFindManyArgs,
        projects: {
          select: { id: true },
        } satisfies Prisma.hrms_projectsFindManyArgs,
        files: { select: { id: true } } satisfies Prisma.hrms_filesFindManyArgs,
        fileUploads: {
          select: { id: true },
        } satisfies Prisma.hrms_file_uploadsFindManyArgs,
      },
    } satisfies Prisma.hrms_organizationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmsOrganization.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      logo_uri: input.logo_uri ?? null,
      currency: input.currency,
      timezone: input.timezone,
      fiscal_start_month: input.fiscal_start_month,
      owner: await HrmsMemberAtSummaryTransformer.transform(input.owner),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
