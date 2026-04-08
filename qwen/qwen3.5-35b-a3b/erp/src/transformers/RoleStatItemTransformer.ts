import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRoleStatItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IRoleStatItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RoleStatItemTransformer {
  export type Payload = Prisma.hrm_platform_rolesGetPayload<{
    select: {
      id: true;
      name: true;
      employees: {
        select: {};
      };
    };
  }>;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        employees: { select: {} },
      },
    } satisfies Prisma.hrm_platform_rolesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IRoleStatItem> {
    return {
      role_id: input.id,
      name: input.name,
      employee_count: input.employees.length,
    } satisfies IRoleStatItem;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RoleStatItemTransformer {
//       export type Payload = Prisma.hrm_platform_rolesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             role_kind: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             organization_id: true,
//           },
//         } satisfies Prisma.hrm_platform_rolesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRoleStatItem> {
//         return {
//   role_id: {string},
//   name: {string},
//   employee_count: {integer},
//         };
//       }
//     }
//--------------------------------------------------------------