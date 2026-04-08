import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformContractCollector {
  export async function collect(props: { body: IHrmPlatformContract.ICreate }) {
    const id: string = v4();
    return {
      id,
      title: props.body.title,
      start_date: new Date(props.body.start_date),
      end_date: props.body.end_date ? new Date(props.body.end_date) : null,
      compensation_amount: props.body.compensation_amount ?? null,
      compensation_currency: props.body.compensation_currency ?? null,
      status: props.body.status,
      notes: props.body.notes ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: { connect: { id: props.body.employee_id } },
      organization: { connect: { id: props.body.organization_id } },
    } satisfies Prisma.hrm_platform_contractsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmPlatformContractCollector {
//         export async function collect(props: {
//           body: IHrmPlatformContract.ICreate;
//           
//           
//           
//         }) {
//           return {
//       id: ...,
//       title: ...,
//       start_date: ...,
//       end_date: ...,
//       compensation_amount: ...,
//       compensation_currency: ...,
//       status: ...,
//       notes: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       employee: ...,
//       organization: ...,
//       snapshot: ...,
//           } satisfies Prisma.hrm_platform_contractsCreateInput;
//         }
//       }
//--------------------------------------------------------------