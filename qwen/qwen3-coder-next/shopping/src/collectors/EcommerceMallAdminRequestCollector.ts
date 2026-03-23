import { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallAdminRequestCollector {
  export async function collect(props: {
    body: IEcommerceMallAdminRequest.ICreate;
    ecommerceMallCustomers: IEntity;
    ecommerceMallAdmins: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.body.reason,
      status: "pending",
      approval_notes: null,
      rejection_reason: null,
      responded_at: null,
      applicant: { connect: { id: props.ecommerceMallCustomers.id } },
      superAdmin: undefined,
      adminRole: undefined,
    } satisfies Prisma.ecommerce_mall_admin_requestsCreateInput;
  }
}
