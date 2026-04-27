import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingOrganizationAtSummaryTransformer } from "./HrmTimeTrackingOrganizationAtSummaryTransformer";
import { HrmTimeTrackingProjectMemberTransformer } from "./HrmTimeTrackingProjectMemberTransformer";
import { HrmTimeTrackingTaskTransformer } from "./HrmTimeTrackingTaskTransformer";
import { HrmTimeTrackingTimelogTransformer } from "./HrmTimeTrackingTimelogTransformer";
import { HrmTimeTrackingTimerTransformer } from "./HrmTimeTrackingTimerTransformer";

export namespace HrmTimeTrackingProjectTransformer {
  export type Payload = Prisma.hrm_time_tracking_projectsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        color_code: true,
        status: true,
        budget_hours: true,
        started_at: true,
        ended_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
        projectMembers: HrmTimeTrackingProjectMemberTransformer.select(),
        tasks: HrmTimeTrackingTaskTransformer.select(),
        timelogs: HrmTimeTrackingTimelogTransformer.select(),
        timers: HrmTimeTrackingTimerTransformer.select(),
      },
    } satisfies Prisma.hrm_time_tracking_projectsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingProject> {
    return {
      id: input.id,
      organization:
        await HrmTimeTrackingOrganizationAtSummaryTransformer.transform(
          input.organization,
        ),
      name: input.name,
      description: input.description ?? undefined,
      color_code: input.color_code,
      status: input.status,
      budget_hours: input.budget_hours ?? undefined,
      started_at: input.started_at?.toISOString() ?? undefined,
      ended_at: input.ended_at?.toISOString() ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? undefined,
      projectMembers: await ArrayUtil.asyncMap(
        input.projectMembers,
        HrmTimeTrackingProjectMemberTransformer.transform,
      ),
      tasks: await ArrayUtil.asyncMap(
        input.tasks,
        HrmTimeTrackingTaskTransformer.transform,
      ),
      timelogs: await ArrayUtil.asyncMap(
        input.timelogs,
        HrmTimeTrackingTimelogTransformer.transform,
      ),
      timers: await ArrayUtil.asyncMap(
        input.timers,
        HrmTimeTrackingTimerTransformer.transform,
      ),
    } satisfies IHrmTimeTrackingProject;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmTimeTrackingProjectTransformer {
//       export type Payload = Prisma.hrm_time_tracking_projectsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             color_code: true,
//             status: true,
//             budget_hours: true,
//             started_at: true,
//             ended_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             organization: HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
//             timelogs: HrmTimeTrackingTimelogTransformer.select(),
//             projectMembers: HrmTimeTrackingProjectMemberTransformer.select(),
//             timers: HrmTimeTrackingTimerTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.hrm_time_tracking_projectsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmTimeTrackingProject> {
//         return {
//   id: {string},
//   organization: await HrmTimeTrackingOrganizationAtSummaryTransformer.transform(input.organization),
//   name: {string},
//   description: {string | null},
//   color_code: {string},
//   status: {string},
//   budget_hours: {number | null},
//   started_at: {string | null},
//   ended_at: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   projectMembers: await ArrayUtil.asyncMap(input.projectMembers, HrmTimeTrackingProjectMemberTransformer.transform),
//   tasks: {Array<IHrmTimeTrackingTask>},
//   timelogs: await ArrayUtil.asyncMap(input.timelogs, HrmTimeTrackingTimelogTransformer.transform),
//   timers: await ArrayUtil.asyncMap(input.timers, HrmTimeTrackingTimerTransformer.transform),
//         };
//       }
//     }
//--------------------------------------------------------------