import { IEcommerceSystemStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceSystemStatusCollector {
  export async function collect(props: {
    body: IEcommerceSystemStatus.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      component_name: props.body.component_name,
      status: props.body.status,
      health_score: props.body.health_score,
      last_check_timestamp: props.body.last_check_timestamp,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.ecommerce_system_statusesCreateInput;
  }
}
