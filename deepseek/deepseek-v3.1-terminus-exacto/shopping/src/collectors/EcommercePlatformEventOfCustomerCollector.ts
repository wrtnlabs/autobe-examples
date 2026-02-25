import { IEcommercePlatformEventOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommercePlatformEventOfCustomerCollector {
  export async function collect(props: {
    body: IEcommercePlatformEventOfCustomer.ICreate;
  }) {
    return {
      id: v4(),
      rule_code: props.body.rule_code,
      rule_name: props.body.rule_name,
      rule_description: props.body.rule_description,
      rule_type: props.body.rule_type,
      configuration_json: props.body.configuration_json,
      is_active: props.body.is_active ?? true,
      execution_order: props.body.execution_order ?? 0,
      version: props.body.version ?? "1.0.0",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.ecommerce_business_rulesCreateInput;
  }
}
