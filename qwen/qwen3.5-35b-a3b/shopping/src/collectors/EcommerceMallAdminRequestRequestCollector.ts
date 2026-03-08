import { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallAdminRequestRequestCollector {
  export async function collect(props: {
    body: IEcommerceMallAdminRequestRequest.ICreate;
    ecommerceMallAdmins: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.body.reason,
      request_status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      admin: { connect: { id: props.ecommerceMallAdmins.id } },
    } satisfies Prisma.ecommerce_mall_admin_request_requestsCreateInput;
  }
}
