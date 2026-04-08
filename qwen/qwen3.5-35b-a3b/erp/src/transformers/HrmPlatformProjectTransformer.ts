import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformOrganizationAtSummaryTransformer } from "./HrmPlatformOrganizationAtSummaryTransformer";
import { HrmPlatformProjectMembershipAtSummaryTransformer } from "./HrmPlatformProjectMembershipAtSummaryTransformer";
import { HrmPlatformTaskAtSummaryTransformer } from "./HrmPlatformTaskAtSummaryTransformer";
import { HrmPlatformTimelogAtSummaryTransformer } from "./HrmPlatformTimelogAtSummaryTransformer";
import { HrmPlatformTimerAtSummaryTransformer } from "./HrmPlatformTimerAtSummaryTransformer";

export namespace HrmPlatformProjectTransformer {
  export type Payload = Prisma.hrm_platform_projectsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        color_code: true,
        description: true,
        budget_hours: true,
        start_date: true,
        end_date: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
        memberships: HrmPlatformProjectMembershipAtSummaryTransformer.select(),
        tasks: HrmPlatformTaskAtSummaryTransformer.select(),
        timers: HrmPlatformTimerAtSummaryTransformer.select(),
        timelogs: HrmPlatformTimelogAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_projectsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformProject> {
    return {
      id: input.id,
      organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      name: input.name,
      color_code: input.color_code,
      description: input.description ?? undefined,
      budget_hours: input.budget_hours ?? undefined,
      start_date: input.start_date ? toISOStringSafe(input.start_date) : null,
      end_date: input.end_date ? toISOStringSafe(input.end_date) : null,
      status: input.status,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      tasks: await ArrayUtil.asyncMap(
        input.tasks,
        async (elem) =>
          await HrmPlatformTaskAtSummaryTransformer.transform(elem),
      ),
      timelogs: await ArrayUtil.asyncMap(
        input.timelogs,
        async (elem) =>
          await HrmPlatformTimelogAtSummaryTransformer.transform(elem),
      ),
      timers: await ArrayUtil.asyncMap(
        input.timers,
        async (elem) =>
          await HrmPlatformTimerAtSummaryTransformer.transform(elem),
      ),
      memberships: await ArrayUtil.asyncMap(
        input.memberships,
        async (elem) =>
          await HrmPlatformProjectMembershipAtSummaryTransformer.transform(
            elem,
          ),
      ),
    } satisfies IHrmPlatformProject;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformProjectTransformer {
//       export type Payload = Prisma.hrm_platform_projectsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             color_code: true,
//             description: true,
//             budget_hours: true,
//             start_date: true,
//             end_date: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             ...
//           },
//         } satisfies Prisma.hrm_platform_projectsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformProject> {
//         return {
//   id: {string},
//   organization: {IHrmPlatformOrganization.ISummary},
//   name: {string},
//   color_code: {string},
//   description: {string | null},
//   budget_hours: {number | null},
//   start_date: {string | null},
//   end_date: {string | null},
//   status: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   tasks: {Array<IHrmPlatformTask.ISummary>},
//   timelogs: {Array<IHrmPlatformTimelog.ISummary>},
//   timers: {Array<IHrmPlatformTimer.ISummary>},
//   memberships: {Array<IHrmPlatformProjectMembership.ISummary>},
//         };
//       }
//     }
//--------------------------------------------------------------