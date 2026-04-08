import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmOrganizationAtSummaryTransformer } from "./HrmOrganizationAtSummaryTransformer";

export namespace HrmProjectAtSummaryTransformer {
  export type Payload = Prisma.hrm_projectsGetPayload<
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
        start_date: true,
        end_date: true,
        created_at: true,
        organization: HrmOrganizationAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_projectsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmProject.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      color_code: input.color_code,
      status: input.status,
      start_date: input.start_date?.toISOString() ?? null,
      end_date: input.end_date?.toISOString() ?? null,
      organization: await HrmOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      created_at: input.created_at.toISOString(),
    } satisfies IHrmProject.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmProjectAtSummaryTransformer {
//       export type Payload = Prisma.hrm_projectsGetPayload<ReturnType<typeof select>>;
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
//             start_date: true,
//             end_date: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             organization: HrmOrganizationAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_projectsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmProject.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string | null},
//   color_code: {string},
//   status: {string},
//   start_date: {string | null},
//   end_date: {string | null},
//   organization: await HrmOrganizationAtSummaryTransformer.transform(input.organization),
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------